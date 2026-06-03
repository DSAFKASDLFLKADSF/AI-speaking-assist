/**
 * Official TOEFL iBT Speaking content (Jan 21, 2026 format).
 * Sourced from ETS publicly distributed practice materials:
 * - toefl-ibt-teachers-resources-practice-test-1.pdf
 * - toefl-ibt-teachers-resources-practice-test-2.pdf
 * - toefl-ibt-full-length-practice-test-1.pdf
 * - toefl-ibt-full-length-practice-test-2.pdf
 */

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
  hints: string[];
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
            "Name one or two concrete strategies.",
            "Explain briefly why each one works for you.",
          ],
        },
        {
          questionType: "preference",
          prompt:
            "Many companies are now developing programs to help employees manage work-life balance. Would programs like this affect your interest in working for a particular company? Why or why not?",
          hints: [
            "Give a clear yes/no or degree of influence.",
            "Support with one practical reason.",
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Some companies also offer flexible working hours or remote work options to help employees achieve a better work-life balance, but they are concerned that these options would reduce employee attention to tasks or engagement in the workplace. Do you think such programs are a good strategy for companies? Why or why not?",
          hints: [
            "Take a clear position.",
            "Address both company and employee perspectives briefly.",
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "Lastly, looking to the future, do you think people's attitudes towards work-life balance will change? For example, do you think people will prioritize personal life over work, or work over personal life? Explain your thoughts.",
          hints: [
            "State your prediction clearly.",
            "Give one reason people might shift priorities.",
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
            "Answer directly in the first sentence.",
            "Add one detail about your living situation.",
          ],
        },
        {
          questionType: "preference",
          prompt:
            "Cities affect people in different ways. Some people find cities dynamic and exciting. Others find that cities are overwhelming and drain them of energy. What kind of reaction do you have to cities? Why do you think you react in this way?",
          hints: [
            "Describe your personal reaction clearly.",
            "Give one reason rooted in experience.",
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Some people believe that those who live in cities lead more interesting lives. They would argue, for example, that people who live in cities have more access to professional opportunities and interesting leisure activities. Do you agree that people who live in cities lead more interesting lives? Why or why not?",
          hints: [
            "State agree/disagree early.",
            "Use one opportunity and one counterpoint if needed.",
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "For some time now, researchers have been interested in whether green spaces, such as parks, make people who live in cities happier. Do you think that city governments should create more parks in urban areas to promote a general sense of happiness and life satisfaction? Why or why not?",
          hints: [
            "Take a clear stance on more parks.",
            "Link parks to happiness or wellbeing with an example.",
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
            "Answer yes/no or how important, then why.",
            "Mention time, cost, or convenience.",
          ],
        },
        {
          questionType: "preference",
          prompt:
            "Imagine that you could choose to commute by car, which is faster but more expensive, or by public transportation, which is slower but less expensive. Which would you choose, and why?",
          hints: [
            "Pick one mode and commit to it.",
            "Compare speed vs cost in one example.",
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Some people believe that commuting can be stressful and tiring. What do you think are one or two different ways to make commuting more enjoyable? Give reasons for your answer.",
          hints: [
            "Offer one or two practical ideas.",
            "Explain why each idea helps.",
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "Lastly, considering advances in technology, some people believe that commuting might disappear entirely. How do you think a severe decline in commuting might affect businesses in positive ways and negative ways? Please give one example of each.",
          hints: [
            "One positive effect on businesses.",
            "One negative effect on businesses.",
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
            "Name a specific activity.",
            "Explain why you or they do it.",
          ],
        },
        {
          questionType: "preference",
          prompt:
            "Some exercise programs are done alone, and some are designed to be done with others. Would you prefer to exercise alone, or would you prefer to exercise with others? Why?",
          hints: [
            "State alone vs with others clearly.",
            "Give one personal reason.",
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Some people believe that exercising outdoors is both more beneficial and more enjoyable than exercising indoors. Do you agree or disagree and why?",
          hints: [
            "Agree or disagree in sentence one.",
            "Compare outdoor vs indoor with one example.",
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "Lastly, I would like to ask about using fitness apps. Some people like to use fitness apps on smart phones to organize their fitness schedules. Do you agree this is a good way to keep track of your exercising goals? Why or why not?",
          hints: [
            "Clear yes/no on fitness apps.",
            "Mention organization, motivation, or accuracy.",
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
