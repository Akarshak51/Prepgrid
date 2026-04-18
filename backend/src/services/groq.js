const axios = require('axios');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const FALLBACK_MODELS = [DEFAULT_MODEL, 'llama-3.3-70b-versatile'];
const MODEL_RETRY_CODES = new Set(['model_decommissioned', 'model_not_found']);

const getApiKey = () => process.env.GROQ_API_KEY;
const getConfiguredModel = () => process.env.GROQ_MODEL || DEFAULT_MODEL;
const getCandidateModels = () => [...new Set([getConfiguredModel(), ...FALLBACK_MODELS])];

const apiKey = getApiKey();
if (!apiKey) {
  console.error('GROQ_API_KEY is not set!');
} else {
  console.log('GROQ_API_KEY loaded:', `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);
}

function shouldRetryWithFallback(err) {
  const groqError = err.response?.data?.error;
  const message = groqError?.message || '';

  if (MODEL_RETRY_CODES.has(groqError?.code)) {
    return true;
  }

  return /decommissioned|no longer supported|model .* not found/i.test(message);
}

function formatGroqError(err) {
  return err.response?.data?.error?.message || err.message || 'AI service temporarily unavailable';
}

async function requestChat(model, messages, systemPrompt, maxTokens = 1024) {
  return axios.post(
    GROQ_URL,
    {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
}

async function chat(messages, systemPrompt, maxTokens = 1024) {
  if (!getApiKey()) {
    throw new Error('GROQ_API_KEY environment variable is not set. Please configure it in Render dashboard.');
  }

  const modelsToTry = getCandidateModels();
  let lastError = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];

    try {
      const res = await requestChat(model, messages, systemPrompt, maxTokens);
      return res.data?.choices?.[0]?.message?.content || '';
    } catch (err) {
      lastError = err;
      const shouldRetry = i < modelsToTry.length - 1 && shouldRetryWithFallback(err);

      if (shouldRetry) {
        console.warn(`Groq model "${model}" is unavailable. Retrying with "${modelsToTry[i + 1]}".`);
        continue;
      }

      console.error('Groq error:', err.response?.data || err.message);
      throw new Error(formatGroqError(err));
    }
  }

  console.error('Groq error:', lastError?.response?.data || lastError?.message);
  throw new Error('AI service temporarily unavailable');
}

function parseJSON(text) {
  try {
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(clean);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeQuizQuestion(question) {
  if (!question || typeof question !== 'object') {
    return null;
  }

  const prompt = typeof question.question === 'string' ? question.question.trim() : '';
  const explanation = typeof question.explanation === 'string' ? question.explanation.trim() : '';
  const options = Array.isArray(question.options)
    ? question.options
        .map((option) => ({
          text: typeof option?.text === 'string' ? option.text.trim() : '',
          isCorrect: Boolean(option?.isCorrect),
        }))
        .filter((option) => option.text)
        .slice(0, 4)
    : [];

  if (!prompt || options.length < 2) {
    return null;
  }

  const firstCorrectIndex = options.findIndex((option) => option.isCorrect);
  const normalizedOptions = options.map((option, index) => ({
    text: option.text,
    isCorrect: firstCorrectIndex === -1 ? index === 0 : index === firstCorrectIndex,
  }));

  return {
    question: prompt,
    options: normalizedOptions,
    explanation,
  };
}

// Interview

exports.generateInterviewQuestion = async (role, difficulty, history = []) => {
  const sys = `You are a senior technical interviewer for ${role} positions. Ask ONE concise technical question at ${difficulty} difficulty. Return ONLY the question, no extra text.`;
  const context = history.length
    ? `Previous questions asked: ${history.slice(-3).join(' | ')}. Ask a different question.`
    : 'Start the interview with a foundational question.';
  return chat([{ role: 'user', content: context }], sys, 200);
};

exports.evaluateAnswer = async (question, answer, role) => {
  const sys = `You are evaluating a ${role} interview answer. Respond in valid JSON only:
{"score": <0-10>, "feedback": "<2 sentences>", "improvement": "<1 actionable tip>"}`;
  const raw = await chat(
    [{ role: 'user', content: `Question: ${question}\nAnswer: ${answer}` }],
    sys,
    400
  );
  return parseJSON(raw) || { score: 5, feedback: raw.substring(0, 200), improvement: 'Keep practicing!' };
};

exports.generateInterviewSummary = async (qaHistory, role) => {
  const sys = `You are a ${role} interview coach. Analyze this interview and return valid JSON only:
{"summary": "<2-3 sentences overall>", "strengths": ["<str1>","<str2>","<str3>"], "improvements": ["<imp1>","<imp2>","<imp3>"]}`;
  const raw = await chat([{ role: 'user', content: JSON.stringify(qaHistory) }], sys, 600);
  return parseJSON(raw) || { summary: 'Interview completed.', strengths: [], improvements: [] };
};

// Quiz

exports.generateQuiz = async (topic, count = 10) => {
  const sys = `You are a quiz generator. Return a valid JSON array of exactly ${count} MCQ objects. Each object:
{"question":"<q>","options":[{"text":"<a>","isCorrect":false},{"text":"<b>","isCorrect":true},{"text":"<c>","isCorrect":false},{"text":"<d>","isCorrect":false}],"explanation":"<why correct answer is right>"}
Exactly ONE option must have isCorrect:true. Return ONLY the JSON array, no other text.`;
  const raw = await chat(
    [{ role: 'user', content: `Generate ${count} MCQs about: ${topic}` }],
    sys,
    3000
  );
  const parsed = parseJSON(raw);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map(normalizeQuizQuestion)
    .filter(Boolean)
    .slice(0, count);
};

exports.evaluateShortAnswer = async (question, answer, topic) => {
  const sys = `You are a ${topic} subject expert. Grade the answer. Return valid JSON only:
{"score": <0-10>, "feedback": "<2 sentences>", "correct_answer": "<brief correct answer>"}`;
  const raw = await chat(
    [{ role: 'user', content: `Q: ${question}\nA: ${answer || '(no answer)'}` }],
    sys,
    300
  );
  return parseJSON(raw) || { score: 0, feedback: 'Unable to evaluate', correct_answer: '' };
};

// Code evaluation hint

exports.getCodeHint = async (code, language, questionTitle) => {
  const sys = `You are a coding mentor. Give a helpful hint (NOT the solution) for the student's code. Be encouraging and specific. Max 3 sentences.`;
  return chat(
    [{ role: 'user', content: `Problem: ${questionTitle}\nLanguage: ${language}\nCode:\n${code}` }],
    sys,
    200
  );
};
