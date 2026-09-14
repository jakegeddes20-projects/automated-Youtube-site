// Real research + script-writing stage, powered by OpenAI (ChatGPT).
// Replaces the free placeholder text now that the rest of the pipeline
// (voice-over, images/video, YouTube publish) is being built around it.
//
// Requires OPENAI_API_KEY to be set as an environment variable — locally in
// .env.local (gitignored, never committed) and in Netlify under
// Project configuration -> Environment variables for the deployed site.

const SYSTEM_PROMPT = `You are a scriptwriter for a faceless YouTube channel covering
Star Wars fan theories and lore stories. Write a spoken narration script, not an essay:
natural, engaging, and paced for a narrator to read aloud over visuals. Aim for roughly
600-900 words (around 4-6 minutes of narration). Do not include stage directions, scene
numbers, or headings — just the narration text itself, in full sentences and paragraphs.`;

export async function generateScript(topic) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local for local dev, and to " +
        "Netlify's Project configuration -> Environment variables for production."
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Write the narration script for this topic: "${topic}"` },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`OpenAI API request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const script = data.choices?.[0]?.message?.content?.trim();

  if (!script) {
    throw new Error("OpenAI API returned no script content.");
  }

  return script;
}