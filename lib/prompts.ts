export interface ListenRepeatPrompt {
  id: string;
  title: string;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  audioSrc: string;
  transcript: string;
}

export const LISTEN_REPEAT_PROMPTS: ListenRepeatPrompt[] = [
  {
    id: "lr-01",
    title: "University Libraries",
    topic: "Campus Life",
    difficulty: "beginner",
    audioSrc: "/audio/listen-repeat/lr-01.wav",
    transcript:
      "University libraries are essential resources that support both research and daily study. They provide access to academic journals, quiet study spaces, and research assistance from trained librarians.",
  },
  {
    id: "lr-02",
    title: "On-Campus Housing",
    topic: "Campus Life",
    difficulty: "beginner",
    audioSrc: "/audio/listen-repeat/lr-02.wav",
    transcript:
      "Living on campus helps freshmen build friendships and stay engaged with university activities. Students can attend club meetings, use the gym, and visit professors during office hours without a long commute.",
  },
  {
    id: "lr-03",
    title: "Online Learning",
    topic: "Education",
    difficulty: "beginner",
    audioSrc: "/audio/listen-repeat/lr-03.wav",
    transcript:
      "Online courses offer flexibility for students who work part-time or live far from campus. Recorded lectures allow learners to review difficult material at their own pace before exams.",
  },
  {
    id: "lr-04",
    title: "Group Study",
    topic: "Study Skills",
    difficulty: "beginner",
    audioSrc: "/audio/listen-repeat/lr-04.wav",
    transcript:
      "Studying in a group encourages students to explain concepts to one another. When peers ask questions, each member identifies gaps in their own understanding and strengthens long-term retention.",
  },
  {
    id: "lr-05",
    title: "Part-Time Jobs",
    topic: "Student Work",
    difficulty: "intermediate",
    audioSrc: "/audio/listen-repeat/lr-05.wav",
    transcript:
      "A part-time campus job teaches time management and professional communication. Working at the library or tutoring center also keeps students connected to academic resources while earning income.",
  },
  {
    id: "lr-06",
    title: "Study Abroad",
    topic: "Global Education",
    difficulty: "intermediate",
    audioSrc: "/audio/listen-repeat/lr-06.wav",
    transcript:
      "Studying abroad exposes students to new cultures and improves language proficiency in real settings. Many participants return with greater confidence, adaptability, and a broader perspective on global issues.",
  },
  {
    id: "lr-07",
    title: "Choosing a Major",
    topic: "Academic Planning",
    difficulty: "intermediate",
    audioSrc: "/audio/listen-repeat/lr-07.wav",
    transcript:
      "Students should explore introductory courses before committing to a major. Internships, faculty advising, and career workshops help them align personal interests with realistic job opportunities after graduation.",
  },
  {
    id: "lr-08",
    title: "Internship Value",
    topic: "Career Preparation",
    difficulty: "intermediate",
    audioSrc: "/audio/listen-repeat/lr-08.wav",
    transcript:
      "Internships bridge classroom theory and workplace practice. By completing projects under professional supervision, students develop practical skills and professional references that strengthen future job applications.",
  },
  {
    id: "lr-09",
    title: "Campus Athletics",
    topic: "Campus Life",
    difficulty: "beginner",
    audioSrc: "/audio/listen-repeat/lr-09.wav",
    transcript:
      "Participating in campus sports promotes physical health and teamwork. Even recreational leagues give students a structured break from coursework and opportunities to socialize outside the classroom.",
  },
  {
    id: "lr-10",
    title: "Academic Advisors",
    topic: "Academic Support",
    difficulty: "intermediate",
    audioSrc: "/audio/listen-repeat/lr-10.wav",
    transcript:
      "Academic advisors help students select courses that satisfy degree requirements. Regular meetings prevent scheduling conflicts and ensure that prerequisites are completed before advanced classes.",
  },
  {
    id: "lr-11",
    title: "Undergraduate Research",
    topic: "Research",
    difficulty: "advanced",
    audioSrc: "/audio/listen-repeat/lr-11.wav",
    transcript:
      "Undergraduate research allows students to apply scientific methods under faculty mentorship. Collecting data, analyzing results, and presenting findings prepare them for graduate programs and evidence-based careers.",
  },
  {
    id: "lr-12",
    title: "Time Management",
    topic: "Study Skills",
    difficulty: "intermediate",
    audioSrc: "/audio/listen-repeat/lr-12.wav",
    transcript:
      "Effective time management begins with a weekly planner that lists deadlines and exam dates. Breaking large assignments into daily tasks reduces procrastination and lowers stress during midterm season.",
  },
  {
    id: "lr-13",
    title: "Note-Taking Strategies",
    topic: "Study Skills",
    difficulty: "intermediate",
    audioSrc: "/audio/listen-repeat/lr-13.wav",
    transcript:
      "Active note-taking requires summarizing lectures in your own words rather than copying slides verbatim. Reviewing notes within twenty-four hours significantly improves recall on later assessments.",
  },
  {
    id: "lr-14",
    title: "Presentation Skills",
    topic: "Communication",
    difficulty: "advanced",
    audioSrc: "/audio/listen-repeat/lr-14.wav",
    transcript:
      "Strong presentations combine a clear structure with concise supporting examples. Speakers who maintain eye contact, control their pace, and rehearse transitions appear more confident and persuasive to academic audiences.",
  },
  {
    id: "lr-15",
    title: "Peer Tutoring",
    topic: "Academic Support",
    difficulty: "beginner",
    audioSrc: "/audio/listen-repeat/lr-15.wav",
    transcript:
      "Peer tutoring benefits both the tutor and the student receiving help. Explaining a concept reinforces the tutor's mastery, while the learner receives personalized feedback in a low-pressure environment.",
  },
  {
    id: "lr-16",
    title: "Campus Volunteering",
    topic: "Community",
    difficulty: "intermediate",
    audioSrc: "/audio/listen-repeat/lr-16.wav",
    transcript:
      "Volunteering through campus organizations connects students with local communities. Service projects develop leadership skills and demonstrate social responsibility on scholarship and employment applications.",
  },
  {
    id: "lr-17",
    title: "Technology in Classrooms",
    topic: "Education",
    difficulty: "intermediate",
    audioSrc: "/audio/listen-repeat/lr-17.wav",
    transcript:
      "Educational technology can make lectures more interactive through polls and simulations. However, instructors must ensure that digital tools support learning objectives instead of distracting from core content.",
  },
  {
    id: "lr-18",
    title: "Academic Integrity",
    topic: "Ethics",
    difficulty: "advanced",
    audioSrc: "/audio/listen-repeat/lr-18.wav",
    transcript:
      "Academic integrity requires students to cite sources and submit original work. Universities enforce honor codes because ethical scholarship builds trust and prepares graduates for professional environments that value honesty.",
  },
  {
    id: "lr-19",
    title: "Work-Life Balance",
    topic: "Wellness",
    difficulty: "intermediate",
    audioSrc: "/audio/listen-repeat/lr-19.wav",
    transcript:
      "Maintaining work-life balance prevents burnout during demanding semesters. Students who schedule exercise, sleep, and social activities alongside study sessions often sustain higher productivity over the long term.",
  },
  {
    id: "lr-20",
    title: "Graduate School Preparation",
    topic: "Career Preparation",
    difficulty: "advanced",
    audioSrc: "/audio/listen-repeat/lr-20.wav",
    transcript:
      "Preparing for graduate school involves building research experience and strong faculty recommendations. Applicants should also practice writing personal statements that clearly connect past coursework to future academic goals.",
  },
];

export const DEFAULT_PROMPT_ID = "lr-01";

export function getPromptById(id: string): ListenRepeatPrompt | undefined {
  return LISTEN_REPEAT_PROMPTS.find((p) => p.id === id);
}

export function getPromptsByTopic(topic: string): ListenRepeatPrompt[] {
  return LISTEN_REPEAT_PROMPTS.filter((p) => p.topic === topic);
}

export function getPromptsByDifficulty(
  difficulty: ListenRepeatPrompt["difficulty"]
): ListenRepeatPrompt[] {
  return LISTEN_REPEAT_PROMPTS.filter((p) => p.difficulty === difficulty);
}

export const PROMPT_TOPICS = Array.from(
  new Set(LISTEN_REPEAT_PROMPTS.map((p) => p.topic))
);
