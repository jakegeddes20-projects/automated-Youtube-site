// Stand-in for the real ChatGPT-powered research + script-writing stage.
// Deliberately kept as free placeholder text until the rest of the pipeline
// (voice-over, images/video, YouTube publish) is built and tested end to end —
// the OpenAI API key only gets added once there's a finished product ready to
// use it, so nothing costs money before then.
export function generatePlaceholderScript(topic) {
  return [
    `[PLACEHOLDER SCRIPT for topic: "${topic}"]`,
    "",
    "This is stand-in narration text generated for free, with no AI call, so the",
    "rest of the pipeline (voice-over, images, video, YouTube publish) can be",
    "built and tested without spending anything on the OpenAI API.",
    "",
    "Once the pipeline works end to end, this stage will be swapped for a real",
    "ChatGPT-generated script based on researched facts about the topic above.",
  ].join("\n");
}
