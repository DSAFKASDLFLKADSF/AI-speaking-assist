/**
 * 2026 TOEFL Speaking — Take an Interview (Virtual Interview)
 *
 * Each session has 4 questions on one theme, asked in sequence:
 *   Q1 personal recall → Q2 preference → Q3 opinion → Q4 policy / prediction
 *
 * Timing: 0s prep · 45s response per question (no preparation time on the real test).
 */

export type InterviewQuestionType =
  | "personal_recall"
  | "preference"
  | "opinion"
  | "policy_prediction";

export const INTERVIEW_QUESTION_TYPE_LABEL: Record<
  InterviewQuestionType,
  string
> = {
  personal_recall: "Personal Recall · Experience",
  preference: "Preference · Feelings",
  opinion: "Opinion · Support",
  policy_prediction: "Policy · Prediction",
};

export interface InterviewPrompt {
  id: string;
  sessionId: string;
  sequence: 1 | 2 | 3 | 4;
  theme: string;
  topic: string;
  questionType: InterviewQuestionType;
  taskNumber: 1 | 2 | 3 | 4;
  taskLabel: string;
  prompt: string;
  prepSeconds: 0;
  responseSeconds: 45;
  hints: string[];
}

export interface InterviewSession {
  id: string;
  theme: string;
  topic: string;
  /** Short researcher intro played before the four questions */
  intro: string;
  questions: InterviewPrompt[];
}

const TIMING = { prepSeconds: 0 as const, responseSeconds: 45 as const };

function q(
  session: Pick<InterviewSession, "id" | "theme" | "topic">,
  sequence: 1 | 2 | 3 | 4,
  questionType: InterviewQuestionType,
  prompt: string,
  hints: string[]
): InterviewPrompt {
  return {
    id: `${session.id}-q${sequence}`,
    sessionId: session.id,
    sequence,
    theme: session.theme,
    topic: session.topic,
    questionType,
    taskNumber: sequence,
    taskLabel: INTERVIEW_QUESTION_TYPE_LABEL[questionType],
    prompt,
    ...TIMING,
    hints,
  };
}

function session(
  id: string,
  theme: string,
  topic: string,
  intro: string,
  questions: Array<{
    type: InterviewQuestionType;
    prompt: string;
    hints: string[];
  }>
): InterviewSession {
  const base = { id, theme, topic };
  return {
    id,
    theme,
    topic,
    intro,
    questions: questions.map((item, index) =>
      q(base, (index + 1) as 1 | 2 | 3 | 4, item.type, item.prompt, item.hints)
    ),
  };
}

export const INTERVIEW_SESSIONS: InterviewSession[] = [
  session(
    "iv-01",
    "Daily Commuting",
    "Transportation",
    "Today I'd like to ask you a few questions about how you commute and get around in daily life.",
    [
      {
        type: "personal_recall",
        prompt:
          "Can you describe how you usually travel to school or work on a typical day?",
        hints: [
          "Mention one or two specific details: time, distance, or mode of transport.",
          "Use past or present tense consistently.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer using public transportation or traveling in a private vehicle? Why?",
        hints: [
          "State your preference in the first sentence.",
          "Give one practical reason and a brief personal example.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Some people believe cities should build more bike lanes instead of widening roads. What is your opinion?",
        hints: [
          "Take a clear yes-or-no stance before explaining.",
          "Support your view with an example from a city or campus you know.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think daily commuting in your area will change over the next twenty years?",
        hints: [
          "Name one trend, such as electric vehicles or remote work.",
          "End with a short prediction or recommendation.",
        ],
      },
    ]
  ),
  session(
    "iv-02",
    "Urban Living",
    "City Life",
    "Let's talk about living in cities and the choices people make about where to live.",
    [
      {
        type: "personal_recall",
        prompt:
          "Tell me about the neighborhood or area where you currently live.",
        hints: [
          "Describe two features: location, people, or nearby places.",
          "Keep the tone conversational, not like a list.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you rather live in a large city or a smaller town? Explain your choice.",
        hints: [
          "Compare both options briefly, then state which you prefer.",
          "Use because, since, or for example to develop your answer.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Do you think parks and green spaces are essential in urban areas? Why or why not?",
        hints: [
          "Answer directly, then give one benefit and one possible drawback.",
          "Mention who benefits most: residents, children, or workers.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What advice would you give someone who is moving to a big city for the first time?",
        hints: [
          "Offer one or two practical tips.",
          "Explain why each tip would help a newcomer adjust.",
        ],
      },
    ]
  ),
  session(
    "iv-03",
    "Social Media",
    "Technology",
    "I'd like to discuss social media and how it fits into everyday life.",
    [
      {
        type: "personal_recall",
        prompt:
          "How often do you use social media, and what do you usually do on those platforms?",
        hints: [
          "Give a realistic frequency and one typical activity.",
          "Mention a platform by name if it helps.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer following news on social media or through traditional news sources?",
        hints: [
          "Compare speed, trust, or convenience.",
          "Share a brief reason from your own experience.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Some schools limit student access to social media during class hours. Do you agree with this policy?",
        hints: [
          "State agree or disagree immediately.",
          "Balance learning focus with reasonable exceptions.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think social media will influence communication among young people in the future?",
        hints: [
          "Predict one positive and one negative effect.",
          "Close with your overall outlook.",
        ],
      },
    ]
  ),
  session(
    "iv-04",
    "Exercise Habits",
    "Health",
    "Let's talk about exercise and staying active in daily life.",
    [
      {
        type: "personal_recall",
        prompt:
          "What kinds of physical activity do you do regularly, if any?",
        hints: [
          "Name the activity and how often you do it.",
          "Explain briefly why you chose that activity.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer exercising alone or with other people? Why?",
        hints: [
          "Contrast both options in one sentence each.",
          "Use a personal example from a gym, team, or walk.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should employers encourage employees to exercise during the workday? What is your view?",
        hints: [
          "Connect physical health to productivity or morale.",
          "Acknowledge a possible challenge, such as time limits.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What changes do you expect to see in how people stay fit over the next decade?",
        hints: [
          "Mention technology, habits, or public health trends.",
          "Keep the prediction specific and realistic.",
        ],
      },
    ]
  ),
  session(
    "iv-05",
    "Work-Life Balance",
    "Career",
    "Today we'll discuss balancing work, study, and personal time.",
    [
      {
        type: "personal_recall",
        prompt:
          "Describe a typical weekday for you. How do you divide your time between responsibilities and free time?",
        hints: [
          "Walk through morning, afternoon, or evening in order.",
          "Mention one activity you wish you had more time for.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you rather have a flexible schedule or fixed working hours? Explain why.",
        hints: [
          "Define what flexibility means for you.",
          "Give one advantage and one trade-off.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Some people say working long hours is necessary for success. Do you agree?",
        hints: [
          "Challenge or support the statement with a clear thesis.",
          "Use an example from school, work, or someone you know.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What could organizations do to help people maintain a healthier work-life balance?",
        hints: [
          "Propose one concrete policy or practice.",
          "Explain the outcome you expect.",
        ],
      },
    ]
  ),
  session(
    "iv-06",
    "Smart Technology",
    "Technology",
    "Let's explore how technology and smart devices are part of daily routines.",
    [
      {
        type: "personal_recall",
        prompt:
          "What smart device or app do you use most often in your daily life?",
        hints: [
          "Name the device or app and its main purpose.",
          "Describe when you typically use it.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer reading on a screen or reading printed materials? Why?",
        hints: [
          "Compare comfort, focus, or portability.",
          "Mention a situation where your preference changes.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Do you think people depend too much on smartphones? Explain your position.",
        hints: [
          "Define what too much dependence means to you.",
          "Offer one benefit and one concern.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How might artificial intelligence change the way students learn in the near future?",
        hints: [
          "Name one likely change in classrooms or study habits.",
          "Note one limitation humans should still provide.",
        ],
      },
    ]
  ),
  session(
    "iv-07",
    "Food Choices",
    "Lifestyle",
    "I'd like to ask about your eating habits and attitudes toward food.",
    [
      {
        type: "personal_recall",
        prompt:
          "Describe what you usually eat on a busy day when you have limited time.",
        hints: [
          "Mention breakfast, lunch, or dinner — not all three.",
          "Explain why that meal fits your schedule.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer cooking at home or eating out? Why?",
        hints: [
          "Compare cost, health, or convenience.",
          "Share when your preference is different.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should schools offer more healthy meal options in cafeterias? What is your opinion?",
        hints: [
          "Focus on student health and learning.",
          "Address one practical difficulty cafeterias face.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think people's eating habits will change as food delivery services grow?",
        hints: [
          "Predict one habit that may increase and one that may decrease.",
          "End with a brief evaluation.",
        ],
      },
    ]
  ),
  session(
    "iv-08",
    "Career Planning",
    "Career",
    "Let's discuss career goals and how people plan for the future.",
    [
      {
        type: "personal_recall",
        prompt:
          "What field or type of job interests you most right now, and how did you become interested in it?",
        hints: [
          "Name the field and one moment that sparked your interest.",
          "Keep the story focused on one experience.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you rather work for a large company or a small organization? Explain your preference.",
        hints: [
          "Compare culture, growth, or stability.",
          "Tie the answer to your personality or goals.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Is it better to choose a career for passion or for financial security? Share your view.",
        hints: [
          "You may blend both sides rather than choose only one.",
          "Support your view with a realistic example.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What advice would you give a student who feels uncertain about their future career?",
        hints: [
          "Suggest one exploratory step, such as internships or courses.",
          "Explain why uncertainty is normal.",
        ],
      },
    ]
  ),
  session(
    "iv-09",
    "Online Learning",
    "Education",
    "Today we'll talk about learning online and in traditional classrooms.",
    [
      {
        type: "personal_recall",
        prompt:
          "Have you taken an online course or used online materials to study? Describe that experience.",
        hints: [
          "Mention the subject and one thing that worked well or poorly.",
          "Use specific details, not general praise.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you learn better in person or online? Why?",
        hints: [
          "Identify what helps you focus or participate.",
          "Give an example from a class or lesson.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should universities continue offering many online courses after in-person classes return fully?",
        hints: [
          "Consider access, flexibility, and interaction.",
          "Take a clear position before elaborating.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think education will combine online and in-person methods in the future?",
        hints: [
          "Describe a hybrid model in concrete terms.",
          "Explain who would benefit most.",
        ],
      },
    ]
  ),
  session(
    "iv-10",
    "Environmental Habits",
    "Environment",
    "Let's discuss everyday choices that affect the environment.",
    [
      {
        type: "personal_recall",
        prompt:
          "What do you personally do to reduce waste or save energy in daily life?",
        hints: [
          "Name one or two habits you actually practice.",
          "Explain when or how often you do them.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you rather pay more for eco-friendly products or buy cheaper conventional ones?",
        hints: [
          "Weigh cost against environmental impact.",
          "Mention a product category as an example.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should governments charge fees for single-use plastic bags? What is your opinion?",
        hints: [
          "Discuss effectiveness and fairness to consumers.",
          "Suggest what the fee money could support.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What environmental change do you expect to see in your community over the next ten years?",
        hints: [
          "Choose one area: transport, recycling, or energy.",
          "Explain what would drive that change.",
        ],
      },
    ]
  ),
  session(
    "iv-11",
    "Travel Experiences",
    "Travel",
    "I'd like to hear about travel and exploring new places.",
    [
      {
        type: "personal_recall",
        prompt:
          "Tell me about a trip or outing you remember well. Where did you go and what did you do?",
        hints: [
          "Set the scene with when and why you went.",
          "Highlight one memorable moment.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer traveling to cities or to natural areas like mountains or beaches?",
        hints: [
          "Explain what you enjoy about your preferred setting.",
          "Contrast it briefly with the other option.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Some people believe international travel is essential for young adults. Do you agree?",
        hints: [
          "Define what essential means in your answer.",
          "Offer an alternative if you disagree.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think tourism will change as more people become concerned about climate change?",
        hints: [
          "Predict one shift in destinations or transport.",
          "Note one benefit or challenge for local communities.",
        ],
      },
    ]
  ),
  session(
    "iv-12",
    "Reading Habits",
    "Education",
    "Let's talk about reading and how people consume written content today.",
    [
      {
        type: "personal_recall",
        prompt:
          "What do you like to read in your free time, if anything?",
        hints: [
          "Mention genre, topic, or format.",
          "Explain why that material appeals to you.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer fiction or non-fiction? Why?",
        hints: [
          "Connect your choice to relaxation or learning.",
          "Give a title or topic as an example.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should schools require students to read more books outside of textbooks?",
        hints: [
          "Discuss literacy, curiosity, or workload.",
          "Propose how schools could support the requirement.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think reading habits will evolve as short-form video content grows?",
        hints: [
          "Predict one risk and one opportunity for readers.",
          "Close with a balanced summary.",
        ],
      },
    ]
  ),
  session(
    "iv-13",
    "Sleep and Rest",
    "Health",
    "Today we'll discuss sleep and how people rest in busy schedules.",
    [
      {
        type: "personal_recall",
        prompt:
          "Describe your typical sleep schedule on weekdays.",
        hints: [
          "Include bedtime, wake time, or bedtime routine.",
          "Mention one factor that affects your sleep.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you function better as a morning person or a night owl? Why?",
        hints: [
          "Describe when you feel most focused or productive.",
          "Use a recent day as evidence.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should schools start classes later to help students get more sleep?",
        hints: [
          "Link sleep to health and academic performance.",
          "Acknowledge scheduling or transportation challenges.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What could individuals do to improve sleep quality without major lifestyle changes?",
        hints: [
          "Suggest one or two realistic habits.",
          "Explain the expected benefit.",
        ],
      },
    ]
  ),
  session(
    "iv-14",
    "Friendship and Community",
    "Social Life",
    "Let's explore friendships and staying connected with others.",
    [
      {
        type: "personal_recall",
        prompt:
          "How do you usually stay in touch with close friends when you are busy?",
        hints: [
          "Name the channel: calls, messages, or in-person meetups.",
          "Mention frequency or a recent example.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer a small circle of close friends or a large network of acquaintances?",
        hints: [
          "Explain what you value in relationships.",
          "Avoid saying both equally without reasons.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Is it more important to maintain old friendships or to make new ones as you grow?",
        hints: [
          "You may prioritize one but respect the other.",
          "Support your view with life stage or goals.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think community life will change as more interactions move online?",
        hints: [
          "Predict one gain and one loss for local communities.",
          "Suggest how people can stay connected offline.",
        ],
      },
    ]
  ),
  session(
    "iv-15",
    "Money and Budgeting",
    "Personal Finance",
    "I'd like to ask about how you manage money and spending decisions.",
    [
      {
        type: "personal_recall",
        prompt:
          "How do you usually track or think about your spending each month?",
        hints: [
          "Describe a method, even if informal.",
          "Mention one category you watch closely.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you rather save money for the future or spend more on experiences now?",
        hints: [
          "Explain your values: security, memories, or growth.",
          "Give a short personal example.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should financial literacy be a required subject in high school?",
        hints: [
          "Discuss budgeting, debt, or future independence.",
          "Address who should teach it.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What financial habit do you think will become more important for young adults in the coming years?",
        hints: [
          "Name the habit and why the economy or technology drives it.",
          "End with practical advice.",
        ],
      },
    ]
  ),
  session(
    "iv-16",
    "Music and Entertainment",
    "Culture",
    "Let's talk about music, media, and how you relax.",
    [
      {
        type: "personal_recall",
        prompt:
          "What kind of music or entertainment do you enjoy when you want to unwind?",
        hints: [
          "Name a genre, artist, or show type.",
          "Explain the mood or effect it creates.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer watching movies at home or in a theater? Why?",
        hints: [
          "Compare atmosphere, cost, or convenience.",
          "Mention the type of film that changes your choice.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Do you think streaming platforms have improved access to culture, or have they made it harder for artists?",
        hints: [
          "Discuss both audiences and creators if possible.",
          "Take a nuanced stance.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you expect people to consume entertainment differently ten years from now?",
        hints: [
          "Mention interactive, virtual, or personalized content.",
          "Keep predictions grounded.",
        ],
      },
    ]
  ),
  session(
    "iv-17",
    "Volunteering",
    "Community",
    "Today we'll discuss volunteering and contributing to the community.",
    [
      {
        type: "personal_recall",
        prompt:
          "Have you ever volunteered or helped others in your community? Describe what you did.",
        hints: [
          "If you have not volunteered, describe informal help you gave.",
          "Focus on one event or role.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you rather volunteer locally or support causes abroad through donations?",
        hints: [
          "Compare direct impact with reach or scale.",
          "Connect to your skills or resources.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should universities require students to complete community service hours?",
        hints: [
          "Weigh civic engagement against academic workload.",
          "Suggest flexible options if you agree.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What role do you think young people will play in solving local problems in the future?",
        hints: [
          "Name one issue and one way youth can contribute.",
          "Close with an encouraging prediction.",
        ],
      },
    ]
  ),
  session(
    "iv-18",
    "Language Learning",
    "Education",
    "Let's explore learning languages and communicating across cultures.",
    [
      {
        type: "personal_recall",
        prompt:
          "Tell me about your experience learning a foreign language or improving your English.",
        hints: [
          "Mention one method that helped and one challenge.",
          "Use a specific classroom or self-study example.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer learning a language through conversation or through structured grammar study?",
        hints: [
          "Explain what builds your confidence faster.",
          "Acknowledge what the other method provides.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should all university students be required to study a second language?",
        hints: [
          "Discuss global careers and cultural awareness.",
          "Note resource or motivation concerns.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How might technology change language learning over the next decade?",
        hints: [
          "Mention apps, AI tutors, or immersion tools.",
          "State what still requires human practice.",
        ],
      },
    ]
  ),
  session(
    "iv-19",
    "Time Management",
    "Study Skills",
    "I'd like to discuss how people organize time and handle deadlines.",
    [
      {
        type: "personal_recall",
        prompt:
          "How do you plan your week when you have several assignments or responsibilities?",
        hints: [
          "Describe a tool or habit: lists, calendars, or priorities.",
          "Mention one thing you do first.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer completing tasks early or working closer to the deadline?",
        hints: [
          "Explain how pressure affects your quality.",
          "Give a recent task as an example.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Is multitasking an effective way to get more done? Share your opinion.",
        hints: [
          "Define multitasking in your answer.",
          "Contrast focus with efficiency.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What strategy would you recommend to someone who constantly feels they have too little time?",
        hints: [
          "Offer one scheduling tip and one mindset shift.",
          "Explain why the combination helps.",
        ],
      },
    ]
  ),
  session(
    "iv-20",
    "Health and Wellness",
    "Health",
    "Let's talk about staying healthy beyond exercise alone.",
    [
      {
        type: "personal_recall",
        prompt:
          "What do you do to manage stress during busy periods?",
        hints: [
          "Name one healthy coping strategy you use.",
          "Describe when you use it.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer preventive care, like regular checkups, or only visiting doctors when sick?",
        hints: [
          "Discuss cost, time, and peace of mind.",
          "Reflect on your current stage of life.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should workplaces provide mental health support as a standard benefit?",
        hints: [
          "Link support to performance and retention.",
          "Address privacy or stigma briefly.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think public attitudes toward mental health will change in the next generation?",
        hints: [
          "Predict one cultural shift and one remaining barrier.",
          "End on a hopeful or realistic note.",
        ],
      },
    ]
  ),
  session(
    "iv-21",
    "Artificial Intelligence",
    "Technology",
    "Today we'll discuss artificial intelligence and its role in society.",
    [
      {
        type: "personal_recall",
        prompt:
          "Have you used an AI tool for school, work, or personal tasks? Describe how you used it.",
        hints: [
          "Name the task and whether it saved time or caused issues.",
          "Stay honest about limits you noticed.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you trust AI to give you advice on important decisions, or prefer human experts?",
        hints: [
          "Distinguish low-stakes from high-stakes decisions.",
          "Explain what trust means to you.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Do you think AI will create more jobs than it eliminates? Explain your view.",
        hints: [
          "Mention new roles and displaced tasks.",
          "Avoid absolute certainty.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What rule or guideline should schools adopt for student use of AI tools?",
        hints: [
          "Balance learning integrity with practical skills.",
          "Propose one clear policy.",
        ],
      },
    ]
  ),
  session(
    "iv-22",
    "Remote Work",
    "Career",
    "Let's explore working and studying from home versus on site.",
    [
      {
        type: "personal_recall",
        prompt:
          "Describe a time when you worked or studied remotely. What was that experience like?",
        hints: [
          "Mention setup, communication, or distractions.",
          "Highlight one lesson you learned.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you rather work remotely most days or go to an office regularly?",
        hints: [
          "Compare collaboration, focus, and commute.",
          "Relate to your personality or role.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should companies require employees to return to the office full time?",
        hints: [
          "Discuss culture, productivity, and employee choice.",
          "Suggest a hybrid compromise if appropriate.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think cities will adapt if more people work from home long term?",
        hints: [
          "Consider transport, housing, or local businesses.",
          "Make one concrete prediction.",
        ],
      },
    ]
  ),
  session(
    "iv-23",
    "Public Transportation",
    "Transportation",
    "I'd like to ask about buses, trains, and public transit systems.",
    [
      {
        type: "personal_recall",
        prompt:
          "When was the last time you used public transportation, and where did you go?",
        hints: [
          "Describe the route or purpose of the trip.",
          "Mention one detail you remember.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer buses or trains when both are available? Why?",
        hints: [
          "Compare speed, comfort, or reliability.",
          "Use a local example.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should governments make public transit free for all residents?",
        hints: [
          "Weigh access against funding and maintenance.",
          "Mention who gains the most.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What improvement would make public transportation more attractive in your area?",
        hints: [
          "Propose one infrastructure or service change.",
          "Explain how it would change rider behavior.",
        ],
      },
    ]
  ),
  session(
    "iv-24",
    "Shopping Habits",
    "Lifestyle",
    "Let's talk about how and where people shop today.",
    [
      {
        type: "personal_recall",
        prompt:
          "Describe a recent purchase you made and why you chose to buy it that way.",
        hints: [
          "Include online versus in-store if relevant.",
          "Explain one factor: price, speed, or quality.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer shopping online or visiting physical stores?",
        hints: [
          "Compare convenience with the ability to inspect products.",
          "Mention product types that change your choice.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Do you think online shopping has hurt local small businesses?",
        hints: [
          "Discuss competition and customer habits.",
          "Suggest how small shops can respond.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you expect consumer shopping behavior to change as delivery becomes faster?",
        hints: [
          "Predict effects on planning, impulse buying, or returns.",
          "Close with a brief evaluation.",
        ],
      },
    ]
  ),
  session(
    "iv-25",
    "Hobbies and Creativity",
    "Personal Growth",
    "Today we'll discuss hobbies and creative activities outside of work or study.",
    [
      {
        type: "personal_recall",
        prompt:
          "What hobby or creative activity do you spend time on, and how did you get started?",
        hints: [
          "Describe frequency and one skill you are building.",
          "Keep the origin story short.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Do you prefer hobbies you can do alone or activities that involve a group?",
        hints: [
          "Explain what you gain from your preferred setting.",
          "Give an example activity.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should schools dedicate more time to arts and creative subjects?",
        hints: [
          "Connect creativity to problem-solving or well-being.",
          "Address curriculum pressure.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What role do you think creative hobbies will play in people's careers in the future?",
        hints: [
          "Mention side projects, content creation, or innovation.",
          "Stay realistic about time limits.",
        ],
      },
    ]
  ),
  session(
    "iv-26",
    "Stress and Pressure",
    "Health",
    "Let's discuss pressure from school, work, and daily expectations.",
    [
      {
        type: "personal_recall",
        prompt:
          "Tell me about a time when you felt under significant pressure. How did you handle it?",
        hints: [
          "Choose one situation, not several.",
          "Explain one action that helped.",
        ],
      },
      {
        type: "preference",
        prompt:
          "When stressed, do you prefer talking with others or solving problems on your own?",
        hints: [
          "Describe what restores your calm faster.",
          "Avoid vague answers like it depends without detail.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Do you believe competition among students or colleagues is mostly helpful or harmful?",
        hints: [
          "Define helpful and harmful in your context.",
          "Support with school or workplace examples.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What could teachers or managers do to reduce unhealthy pressure while keeping high standards?",
        hints: [
          "Suggest one change to expectations or feedback.",
          "Explain the balance you want.",
        ],
      },
    ]
  ),
  session(
    "iv-27",
    "Campus Life",
    "Education",
    "I'd like to hear about life on or near a university campus.",
    [
      {
        type: "personal_recall",
        prompt:
          "Describe one aspect of campus life that has been important to you.",
        hints: [
          "Choose clubs, housing, libraries, or events.",
          "Explain why it mattered.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you rather live on campus or commute from home if both were possible?",
        hints: [
          "Compare independence, cost, and social life.",
          "Relate to your current situation.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should universities limit the number of extracurricular commitments students take on?",
        hints: [
          "Discuss balance and burnout.",
          "Respect student autonomy in your argument.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think campus communities will change as more courses move online?",
        hints: [
          "Predict effects on clubs, housing, and student interaction.",
          "Offer one way to preserve community.",
        ],
      },
    ]
  ),
  session(
    "iv-28",
    "Digital Privacy",
    "Technology",
    "Let's talk about privacy and sharing information online.",
    [
      {
        type: "personal_recall",
        prompt:
          "How careful are you about sharing personal information on apps or websites?",
        hints: [
          "Give one rule you follow.",
          "Mention a type of data you protect.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you trade some privacy for more personalized online services?",
        hints: [
          "Define what personalization means to you.",
          "Use a concrete service as an example.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should governments regulate how companies collect and use personal data more strictly?",
        hints: [
          "Weigh innovation against consumer protection.",
          "Mention enforcement or transparency.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "How do you think attitudes toward digital privacy will change among young people?",
        hints: [
          "Predict one increasing concern and one area of acceptance.",
          "Summarize your outlook.",
        ],
      },
    ]
  ),
  session(
    "iv-29",
    "Sustainable Living",
    "Environment",
    "Today we'll discuss sustainable choices in everyday life.",
    [
      {
        type: "personal_recall",
        prompt:
          "What is one change you have made, or could make, to live more sustainably?",
        hints: [
          "Be specific about food, transport, or consumption.",
          "Explain your motivation.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you rather buy fewer high-quality items or replace cheaper goods more often?",
        hints: [
          "Connect to waste, budget, and durability.",
          "Give a product example.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Should large companies be legally required to reduce their carbon emissions?",
        hints: [
          "Discuss scale of impact and compliance costs.",
          "State whether incentives or penalties work better.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What sustainable habit do you think will become mainstream in the next fifteen years?",
        hints: [
          "Name the habit and what will drive adoption.",
          "Note one obstacle to overcome.",
        ],
      },
    ]
  ),
  session(
    "iv-30",
    "Future of Work",
    "Career",
    "Let's explore how work itself may change in the years ahead.",
    [
      {
        type: "personal_recall",
        prompt:
          "Describe a skill you are building now that you believe will be useful in your future career.",
        hints: [
          "Name the skill and how you practice it.",
          "Link it to a field or role.",
        ],
      },
      {
        type: "preference",
        prompt:
          "Would you rather specialize deeply in one field or develop a broad range of skills?",
        hints: [
          "Discuss adaptability versus expertise.",
          "Relate to trends in hiring.",
        ],
      },
      {
        type: "opinion",
        prompt:
          "Do you think lifelong learning will become necessary for almost every profession?",
        hints: [
          "Explain why technology or markets change quickly.",
          "Give an example profession.",
        ],
      },
      {
        type: "policy_prediction",
        prompt:
          "What advice would you give today's students to prepare for jobs that do not exist yet?",
        hints: [
          "Focus on transferable skills, not specific titles.",
          "End with one actionable recommendation.",
        ],
      },
    ]
  ),
];

/** Flat list of all 120 interview questions (30 sessions × 4 questions). */
export const INTERVIEW_PROMPTS: InterviewPrompt[] = INTERVIEW_SESSIONS.flatMap(
  (s) => s.questions
);

export const DEFAULT_INTERVIEW_SESSION_ID = "iv-01";

export const INTERVIEW_TOPICS = Array.from(
  new Set(INTERVIEW_SESSIONS.map((s) => s.topic))
);

export function getInterviewSessionById(
  id: string
): InterviewSession | undefined {
  return INTERVIEW_SESSIONS.find((s) => s.id === id);
}

export function getInterviewPromptById(
  id: string
): InterviewPrompt | undefined {
  return INTERVIEW_PROMPTS.find((p) => p.id === id);
}

export function getInterviewSessionsByTopic(
  topic: string
): InterviewSession[] {
  return INTERVIEW_SESSIONS.filter((s) => s.topic === topic);
}

export function getRandomInterviewSession(): InterviewSession {
  const index = Math.floor(Math.random() * INTERVIEW_SESSIONS.length);
  return INTERVIEW_SESSIONS[index]!;
}
