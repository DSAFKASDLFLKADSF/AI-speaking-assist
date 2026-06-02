/** Examiner portrait shown during Virtual Interview (test-like UI). */
export const EXAMINER_IMAGE_URL = "/images/examiner.svg";

const TOPIC_SLUG_MAP: Record<string, string> = {
  "Campus Life": "campus",
  Education: "education",
  "Study Skills": "education",
  "Student Work": "career",
  "Global Education": "education",
  "Academic Planning": "education",
  "Career Preparation": "career",
  Transportation: "transportation",
  "City Life": "society",
  Technology: "technology",
  "Social Media": "technology",
  Environment: "environment",
  Health: "health",
  "Work & Career": "career",
  "Future of Work": "career",
  Communication: "society",
  Culture: "society",
  Economics: "society",
  Politics: "society",
  Science: "science",
  Sports: "health",
  Travel: "transportation",
  Food: "society",
  Family: "society",
  Housing: "campus",
  Shopping: "society",
  Entertainment: "society",
  Volunteering: "society",
  Leadership: "career",
  Innovation: "technology",
  Sustainability: "environment",
  Wellness: "health",
};

function slugifyTopic(topic: string): string {
  const mapped = TOPIC_SLUG_MAP[topic];
  if (mapped) return mapped;
  return "general";
}

export function getTopicImageUrl(topic: string): string {
  return `/images/topics/${slugifyTopic(topic)}.svg`;
}

export function getInterviewSessionImageUrl(session: {
  topic: string;
  theme: string;
}): string {
  return getTopicImageUrl(session.topic);
}
