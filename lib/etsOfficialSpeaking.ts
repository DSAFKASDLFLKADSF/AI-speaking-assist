/**
 * Official TOEFL iBT Speaking content (Jan 21, 2026 format).
 * Sourced from ETS publicly distributed practice materials:
 * - toefl-ibt-teachers-resources-practice-test-1.pdf
 * - toefl-ibt-teachers-resources-practice-test-2.pdf
 * - toefl-ibt-full-length-practice-test-1.pdf
 * - toefl-ibt-full-length-practice-test-2.pdf
 */

import type { InterviewHintBullet } from "@/lib/interviewHintContent";

/** Official per-item response windows for Listen & Repeat (items 1–7). */
export const OFFICIAL_LR_RESPONSE_SECONDS = [8, 8, 10, 10, 10, 12, 12] as const;

export type OfficialInterviewQuestionType =
  | "personal_recall"
  | "preference"
  | "opinion"
  | "policy_prediction";

export interface OfficialListenRepeatSentence {
  text: string;
  responseSeconds: number;
}

export interface OfficialListenRepeatBlock {
  scenario: string;
  topic: string;
  sentences: OfficialListenRepeatSentence[];
}

export interface OfficialInterviewQuestion {
  questionType: OfficialInterviewQuestionType;
  prompt: string;
  /** Claim + example phrases for each answer angle. */
  hints: InterviewHintBullet[];
}

export interface OfficialInterviewBlock {
  theme: string;
  topic: string;
  intro: string;
  questions: OfficialInterviewQuestion[];
}

export interface OfficialSpeakingSet {
  id: string;
  title: string;
  subtitle: string;
  etsSource: string;
  listenRepeat: OfficialListenRepeatBlock;
  interview: OfficialInterviewBlock;
}

export const OFFICIAL_SPEAKING_SETS: OfficialSpeakingSet[] = [
  {
    id: "ets-tr-01",
    title: "Official Practice · Set 1",
    subtitle: "University orientation · Work-life balance",
    etsSource: "TOEFL iBT Teacher Resources Practice Test 1",
    listenRepeat: {
      scenario:
        "You are training to assist visitors at a university orientation event. Listen to the speaker and repeat what she says. Repeat only once.",
      topic: "Campus Life",
      sentences: [
        { text: "Welcome to our event.", responseSeconds: 8 },
        { text: "Get your name badge at the registration desk.", responseSeconds: 8 },
        { text: "Our event is in the auditorium.", responseSeconds: 10 },
        {
          text: "For small group sessions, we will be in the breakout rooms over here.",
          responseSeconds: 10,
        },
        {
          text: "Snacks can be found in the vending area throughout the event.",
          responseSeconds: 10,
        },
        { text: "Please see the information desk if you need an agenda.", responseSeconds: 12 },
        {
          text: "If you want to check session times and locations, please use the schedule provided.",
          responseSeconds: 12,
        },
      ],
    },
    interview: {
      theme: "Work-Life Balance",
      topic: "Career",
      intro:
        "You have volunteered for a research study about work-life balance. You will have a short online interview with a researcher. The researcher will ask you some questions.",
      questions: [
        {
          questionType: "personal_recall",
          prompt:
            "First, can you share one or two strategies that you use that you think are effective in managing your work-life balance?",
          hints: [
            {
              claim: "Set clear boundaries after work",
              examples: [
                "stop checking email",
                "turn off notifications",
                "keep weekends free",
              ],
            },
            {
              claim: "Protect personal time with scheduling",
              examples: [
                "time blocking",
                "family dinners",
                "short daily walks",
              ],
            },
            {
              claim: "Share workload when possible",
              examples: ["delegate tasks", "ask for help", "say no to extras"],
            },
          ],
        },
        {
          questionType: "preference",
          prompt:
            "Many companies are now developing programs to help employees manage work-life balance. Would programs like this affect your interest in working for a particular company? Why or why not?",
          hints: [
            {
              claim: "Strong benefits would attract me",
              examples: [
                "paid leave",
                "childcare support",
                "mental health days",
              ],
            },
            {
              claim: "Flexibility matters as much as perks",
              examples: [
                "remote days",
                "flexible hours",
                "compressed workweek",
              ],
            },
            {
              claim: "Culture still decides the job",
              examples: [
                "respectful managers",
                "realistic deadlines",
                "no guilt for logging off",
              ],
            },
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Some companies also offer flexible working hours or remote work options to help employees achieve a better work-life balance, but they are concerned that these options would reduce employee attention to tasks or engagement in the workplace. Do you think such programs are a good strategy for companies? Why or why not?",
          hints: [
            {
              claim: "Flexibility can boost productivity",
              examples: ["less commute", "fewer distractions", "focused deep work"],
            },
            {
              claim: "Remote work can weaken connection",
              examples: ["isolation", "slower teamwork", "missed hallway chats"],
            },
            {
              claim: "Trust-based policies need clear goals",
              examples: [
                "output metrics",
                "regular check-ins",
                "hybrid office days",
              ],
            },
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "Lastly, looking to the future, do you think people's attitudes towards work-life balance will change? For example, do you think people will prioritize personal life over work, or work over personal life? Explain your thoughts.",
          hints: [
            {
              claim: "Personal life may gain priority",
              examples: [
                "burnout awareness",
                "family time",
                "remote work normalization",
              ],
            },
            {
              claim: "Work may still dominate for many",
              examples: [
                "career ambition",
                "rising living costs",
                "side hustles",
              ],
            },
            {
              claim: "Technology will reshape expectations",
              examples: ["automation", "gig jobs", "always-on culture"],
            },
          ],
        },
      ],
    },
  },
  {
    id: "ets-fl-01",
    title: "Official Practice · Set 2",
    subtitle: "Zoo visitor guide · Urban life",
    etsSource: "TOEFL iBT Full-Length Practice Test 1",
    listenRepeat: {
      scenario:
        "You are learning to welcome visitors to the zoo. Listen to your manager and repeat what she says. Repeat only once.",
      topic: "Community",
      sentences: [
        { text: "We have a variety of wildlife.", responseSeconds: 8 },
        { text: "Bears, wolves, and large cats are to the right.", responseSeconds: 8 },
        {
          text: "You can find sea lions and elephants further down the path.",
          responseSeconds: 10,
        },
        {
          text: "Please, no outside food or drinks, and do not feed the animals.",
          responseSeconds: 10,
        },
        {
          text: "Avoid banging or tapping on the displays and enclosures.",
          responseSeconds: 10,
        },
        {
          text: "For those with children, we offer summer camps and educational opportunities.",
          responseSeconds: 12,
        },
        {
          text: "The visitor's center, located near the front entrance, can give you more information.",
          responseSeconds: 12,
        },
      ],
    },
    interview: {
      theme: "Urban Life",
      topic: "City Life",
      intro:
        "You have agreed to take part in a research study about urban life. You will have a short online interview with a researcher. The researcher will ask you some questions.",
      questions: [
        {
          questionType: "personal_recall",
          prompt:
            "Do you currently live in a big city, a small town, or a village?",
          hints: [
            {
              claim: "I live in a big city",
              examples: [
                "downtown apartment",
                "subway nearby",
                "busy streets",
              ],
            },
            {
              claim: "I prefer a quieter small town",
              examples: ["fewer crowds", "lower cost", "shorter errands"],
            },
            {
              claim: "Suburbs can be a middle ground",
              examples: [
                "more space",
                "train commute",
                "family-friendly streets",
              ],
            },
          ],
        },
        {
          questionType: "preference",
          prompt:
            "Cities affect people in different ways. Some people find cities dynamic and exciting. Others find that cities are overwhelming and drain them of energy. What kind of reaction do you have to cities? Why do you think you react in this way?",
          hints: [
            {
              claim: "Cities feel exciting and energizing",
              examples: ["nightlife", "diverse food", "constant activity"],
            },
            {
              claim: "Cities can feel overwhelming",
              examples: ["noise", "crowds", "fast pace", "sensory overload"],
            },
            {
              claim: "Personality shapes the reaction",
              examples: [
                "introvert vs extrovert",
                "childhood hometown",
                "current stress level",
              ],
            },
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Some people believe that those who live in cities lead more interesting lives. They would argue, for example, that people who live in cities have more access to professional opportunities and interesting leisure activities. Do you agree that people who live in cities lead more interesting lives? Why or why not?",
          hints: [
            {
              claim: "City life offers everyday convenience",
              examples: [
                "supermarkets nearby",
                "24-hour shops",
                "fast delivery",
              ],
            },
            {
              claim: "Transportation makes city life easier",
              examples: ["subway", "bus routes", "short taxi rides"],
            },
            {
              claim: "City life can also feel harsh",
              examples: ["loud streets", "fast pace", "high rent"],
            },
            {
              claim: "Leisure options are richer in cities",
              examples: ["museums", "concerts", "new restaurants"],
            },
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "For some time now, researchers have been interested in whether green spaces, such as parks, make people who live in cities happier. Do you think that city governments should create more parks in urban areas to promote a general sense of happiness and life satisfaction? Why or why not?",
          hints: [
            {
              claim: "Parks improve daily wellbeing",
              examples: [
                "fresh air",
                "walking paths",
                "stress relief",
                "picnic spots",
              ],
            },
            {
              claim: "Green space builds community",
              examples: [
                "playgrounds",
                "group exercise",
                "weekend markets",
              ],
            },
            {
              claim: "Every city faces space and cost limits",
              examples: [
                "maintenance budgets",
                "crowded neighborhoods",
                "competing land use",
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "ets-fl-02",
    title: "Official Practice · Set 3",
    subtitle: "Campus gym · Commuting habits",
    etsSource: "TOEFL iBT Full-Length Practice Test 2",
    listenRepeat: {
      scenario:
        "You are learning how to guide new students through the campus gym. Listen to the speaker and repeat what she says. Repeat only once.",
      topic: "Campus Life",
      sentences: [
        { text: "Welcome to our campus gym.", responseSeconds: 8 },
        { text: "Cardio machines are near the entrance.", responseSeconds: 8 },
        { text: "Free weights are in the back.", responseSeconds: 10 },
        {
          text: "All of our locker rooms are equipped with showers and towels.",
          responseSeconds: 10,
        },
        {
          text: "Our fitness instructors hold exercise classes over here.",
          responseSeconds: 10,
        },
        {
          text: "You can check the schedule for available classes and timings.",
          responseSeconds: 12,
        },
        {
          text: "If you have any questions, please seek assistance from the attendants at the help desk.",
          responseSeconds: 12,
        },
      ],
    },
    interview: {
      theme: "Commuting Habits",
      topic: "Transportation",
      intro:
        "You have volunteered for a research study about commuting habits. You will have a short online interview with a researcher. The researcher will ask you some questions.",
      questions: [
        {
          questionType: "personal_recall",
          prompt:
            "First, is it important to live close to your school or work? Why?",
          hints: [
            {
              claim: "Living nearby saves time every day",
              examples: [
                "shorter commute",
                "more sleep",
                "less rush-hour stress",
              ],
            },
            {
              claim: "Distance raises daily costs",
              examples: ["gas money", "transit fares", "parking fees"],
            },
            {
              claim: "Proximity makes life more flexible",
              examples: [
                "lunch at home",
                "gym after work",
                "pick up kids quickly",
              ],
            },
          ],
        },
        {
          questionType: "preference",
          prompt:
            "Imagine that you could choose to commute by car, which is faster but more expensive, or by public transportation, which is slower but less expensive. Which would you choose, and why?",
          hints: [
            {
              claim: "A car is faster but costly",
              examples: [
                "traffic jams",
                "parking fees",
                "fuel and insurance",
              ],
            },
            {
              claim: "Public transit is cheaper but slower",
              examples: ["subway", "bus schedule", "walk to the stop"],
            },
            {
              claim: "The best choice depends on lifestyle",
              examples: ["reliability", "comfort", "budget", "city layout"],
            },
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Some people believe that commuting can be stressful and tiring. What do you think are one or two different ways to make commuting more enjoyable? Give reasons for your answer.",
          hints: [
            {
              claim: "Use travel time productively",
              examples: ["podcasts", "audiobooks", "language apps"],
            },
            {
              claim: "Make the trip itself more pleasant",
              examples: ["music playlists", "scenic route", "cycling"],
            },
            {
              claim: "Share the ride when possible",
              examples: [
                "carpool with coworkers",
                "chat with a friend",
                "less boredom",
              ],
            },
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "Lastly, considering advances in technology, some people believe that commuting might disappear entirely. How do you think a severe decline in commuting might affect businesses in positive ways and negative ways? Please give one example of each.",
          hints: [
            {
              claim: "Businesses could cut office costs",
              examples: [
                "lower rent",
                "smaller headquarters",
                "less parking",
              ],
            },
            {
              claim: "Hiring could become more flexible",
              examples: [
                "nationwide recruiting",
                "async schedules",
                "remote tools",
              ],
            },
            {
              claim: "Local businesses may lose customers",
              examples: ["empty cafes", "less foot traffic", "quiet districts"],
            },
            {
              claim: "Team culture may weaken",
              examples: [
                "fewer face-to-face meetings",
                "less bonding",
                "harder onboarding",
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "ets-tr-02",
    title: "Official Practice · Set 4",
    subtitle: "Library checkout · Exercise habits",
    etsSource: "TOEFL iBT Teacher Resources Practice Test 2",
    listenRepeat: {
      scenario:
        "You are guiding students through the process of checking out books at the university library. Listen to the speaker and repeat what she says. Repeat only once.",
      topic: "Education",
      sentences: [
        { text: "Welcome to the library.", responseSeconds: 8 },
        { text: "Our self-checkout station is for quick service.", responseSeconds: 8 },
        { text: "You can start here to scan your library card.", responseSeconds: 10 },
        {
          text: "Student aids are at the help desk in case you need assitance.",
          responseSeconds: 10,
        },
        {
          text: "We hope everyone will ensure that books are returned on time.",
          responseSeconds: 10,
        },
        {
          text: "Check your account online for updates on due dates and fines.",
          responseSeconds: 12,
        },
        {
          text: "When you are finished reading them, please place all your books in the return bin.",
          responseSeconds: 12,
        },
      ],
    },
    interview: {
      theme: "Exercise Habits",
      topic: "Health",
      intro:
        "You have volunteered for a research study about exercise habits. You will have a short online interview with a researcher. The researcher will ask you some questions.",
      questions: [
        {
          questionType: "personal_recall",
          prompt:
            "First, can you describe the type of exercise you or someone you know typically does regularly, such as running, yoga, or weightlifting? Why?",
          hints: [
            {
              claim: "Cardio builds stamina over time",
              examples: ["running", "cycling", "swimming laps", "jump rope"],
            },
            {
              claim: "Strength training builds muscle",
              examples: [
                "weightlifting",
                "resistance bands",
                "bodyweight squats",
              ],
            },
            {
              claim: "Mind-body exercise reduces stress",
              examples: ["yoga", "Pilates", "stretching routines"],
            },
          ],
        },
        {
          questionType: "preference",
          prompt:
            "Some exercise programs are done alone, and some are designed to be done with others. Would you prefer to exercise alone, or would you prefer to exercise with others? Why?",
          hints: [
            {
              claim: "Exercising alone offers focus",
              examples: [
                "flexible schedule",
                "no waiting for others",
                "personal pace",
              ],
            },
            {
              claim: "Group exercise adds motivation",
              examples: ["gym class", "running club", "friendly competition"],
            },
            {
              claim: "Social pressure can help or hurt",
              examples: [
                "accountability partner",
                "gym intimidation",
                "comparing progress",
              ],
            },
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Some people believe that exercising outdoors is both more beneficial and more enjoyable than exercising indoors. Do you agree or disagree and why?",
          hints: [
            {
              claim: "Outdoors feels refreshing",
              examples: ["sunshine", "fresh air", "parks", "scenic trails"],
            },
            {
              claim: "Indoors is more controlled",
              examples: [
                "gym equipment",
                "air conditioning",
                "weather-proof routine",
              ],
            },
            {
              claim: "Safety and access vary",
              examples: [
                "traffic for runners",
                "gym membership cost",
                "seasonal weather",
              ],
            },
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "Lastly, I would like to ask about using fitness apps. Some people like to use fitness apps on smart phones to organize their fitness schedules. Do you agree this is a good way to keep track of your exercising goals? Why or why not?",
          hints: [
            {
              claim: "Apps help track progress",
              examples: [
                "step counter",
                "workout log",
                "progress charts",
              ],
            },
            {
              claim: "Reminders keep habits consistent",
              examples: [
                "daily alerts",
                "streak goals",
                "scheduled rest days",
              ],
            },
            {
              claim: "Apps are not always reliable",
              examples: [
                "GPS errors",
                "battery drain",
                "easy to ignore notifications",
              ],
            },
          ],
        },
      ],
    },
  },
];

export function getOfficialSpeakingSetById(
  id: string
): OfficialSpeakingSet | undefined {
  return OFFICIAL_SPEAKING_SETS.find((s) => s.id === id);
}

export function getRandomOfficialSpeakingSet(): OfficialSpeakingSet {
  const index = Math.floor(Math.random() * OFFICIAL_SPEAKING_SETS.length);
  return OFFICIAL_SPEAKING_SETS[index]!;
}
