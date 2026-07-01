/** Examiner portrait shown during Virtual Interview (test-like UI). */
export const EXAMINER_IMAGE_URL = "/images/examiner.svg";

const TOPIC_SLUG_MAP: Record<string, string> = {
  "Campus Life": "campus",
  Education: "education",
  Community: "society",
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

/** Per official set: topic image slug for each L&R item (1–7). */
const LR_SET_SCENE_TOPICS: Record<string, string[]> = {
  "ets-tr-01": ["campus", "campus", "education", "education", "campus", "general", "general"],
  "ets-fl-01": ["society", "environment", "environment", "health", "science", "education", "general"],
  "ets-fl-02": ["health", "health", "health", "campus", "health", "education", "campus"],
  "ets-tr-02": ["education", "education", "education", "education", "education", "technology", "education"],
  "custom-01": ["society", "society", "society", "society", "society", "society", "society"],
  "custom-02": ["transportation", "transportation", "transportation", "transportation", "transportation", "transportation", "transportation"],
  "custom-03": ["campus", "campus", "campus", "campus", "campus", "campus", "campus"],
  "custom-04": ["education", "education", "education", "education", "education", "education", "education"],
};

const LR_SET_SCENE_LABELS: Record<string, string[]> = {
  "ets-tr-01": [
    "Orientation desk",
    "Registration",
    "Main auditorium",
    "Breakout rooms",
    "Refreshments",
    "Information desk",
    "Event schedule",
  ],
  "ets-fl-01": [
    "Wildlife exhibits",
    "Predator zone",
    "Aquatic path",
    "Visitor rules",
    "Animal habitats",
    "Summer programs",
    "Visitor center",
  ],
  "ets-fl-02": [
    "Gym entrance",
    "Cardio area",
    "Weight room",
    "Locker rooms",
    "Fitness classes",
    "Class schedule",
    "Help desk",
  ],
  "ets-tr-02": [
    "Library entrance",
    "Self-checkout",
    "Library card",
    "Help desk",
    "Returns policy",
    "Online account",
    "Return bin",
  ],
  "custom-01": [
    "Museum entrance",
    "Ticket check",
    "Information desk",
    "Second floor",
    "Galleries",
    "Guided tours",
    "Visitor rules",
  ],
  "custom-02": [
    "Platform 4",
    "On-time service",
    "Ticket scan",
    "Safety line",
    "Announcements",
    "Conductor desk",
    "Baggage rules",
  ],
  "custom-03": [
    "Parking lot",
    "Permit display",
    "North garage",
    "Accessible spots",
    "Rate sign",
    "Security office",
    "Overnight rules",
  ],
  "custom-04": [
    "Library entrance",
    "Self-checkout",
    "Fiction floor",
    "Quiet zones",
    "Reference area",
    "Help desk",
    "Return box",
  ],
};

export function getListenRepeatSceneVisual(
  setId: string,
  sentenceIndex: number
): { topicImageUrl: string; sceneLabel: string; topic: string } {
  const topics = LR_SET_SCENE_TOPICS[setId] ?? ["general"];
  const labels = LR_SET_SCENE_LABELS[setId] ?? ["Scene"];
  const i = Math.max(0, Math.min(sentenceIndex - 1, 6));
  const slug = topics[i] ?? "general";
  return {
    topicImageUrl: `/images/topics/${slug}.svg`,
    sceneLabel: labels[i] ?? "Scene",
    topic: slug,
  };
}

/** Interview section image after L&R — distinct per official set. */
export function getInterviewSectionImageUrl(officialSetId: string): string {
  const map: Record<string, string> = {
    "ets-tr-01": "career",
    "ets-fl-01": "society",
    "ets-fl-02": "transportation",
    "ets-tr-02": "health",
    "custom-01": "education",
    "custom-02": "technology",
    "custom-03": "society",
    "custom-04": "transportation",
  };
  const slug = map[officialSetId] ?? "general";
  return `/images/topics/${slug}.svg`;
}

export function getInterviewSessionImageUrl(session: {
  topic: string;
  theme: string;
  officialSetId?: string;
}): string {
  if (session.officialSetId) {
    return getInterviewSectionImageUrl(session.officialSetId);
  }
  return getTopicImageUrl(session.topic);
}
