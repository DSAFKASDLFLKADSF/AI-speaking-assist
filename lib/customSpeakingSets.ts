/**
 * Additional practice tests (7 L&R + 4 Interview each).
 * Appended after the four ETS official sets in OFFICIAL_SPEAKING_SETS.
 */

import type { OfficialSpeakingSet } from "@/lib/etsOfficialSpeaking";

export const CUSTOM_SPEAKING_SETS: OfficialSpeakingSet[] = [
  {
    id: "custom-01",
    title: "Practice Test 5",
    subtitle: "City Museum · Learning & education",
    etsSource: "TOEFL Speaking Practice · Test 5",
    listenRepeat: {
      scenario:
        "You are learning how to guide new students through the City Museum. Listen to the speaker and repeat what she says. Repeat only once.",
      topic: "Culture",
      sentences: [
        { text: "Welcome to the city museum!", responseSeconds: 8 },
        { text: "Please keep your ticket visible.", responseSeconds: 8 },
        {
          text: "Audio guides are available at the information desk.",
          responseSeconds: 10,
        },
        {
          text: "Special exhibits are located on the second floor.",
          responseSeconds: 10,
        },
        {
          text: "You're free to explore the galleries at your own pace.",
          responseSeconds: 10,
        },
        {
          text: "If you'd like a guided tour, they begin every hour near the gift shop.",
          responseSeconds: 12,
        },
        {
          text: "Flash photography is not permitted, and cell phones must be silenced during your visit.",
          responseSeconds: 12,
        },
      ],
    },
    interview: {
      theme: "Learning & Education",
      topic: "Education",
      intro:
        "You will have a short online interview about learning and education. The interviewer will ask you some questions.",
      questions: [
        {
          questionType: "personal_recall",
          prompt:
            "Welcome to our interview. Tell me about your most memorable learning experience and why it was important to you.",
          hints: [
            {
              claim: "A great teacher made the difference",
              examples: [
                "clear explanations",
                "encouraging feedback",
                "hands-on projects",
              ],
            },
            {
              claim: "A challenging project built confidence",
              examples: [
                "group presentation",
                "research paper",
                "language immersion",
              ],
            },
            {
              claim: "Learning outside school mattered too",
              examples: ["volunteer work", "travel abroad", "online course"],
            },
          ],
        },
        {
          questionType: "preference",
          prompt:
            "I see. Some people prefer to study alone, while others prefer group study. Which do you prefer and why?",
          hints: [
            {
              claim: "Studying alone helps me focus",
              examples: ["fewer distractions", "my own pace", "quiet library"],
            },
            {
              claim: "Group study keeps me accountable",
              examples: ["quiz each other", "share notes", "explain ideas aloud"],
            },
            {
              claim: "It depends on the subject",
              examples: [
                "math alone",
                "discussion classes together",
                "deadline crunch",
              ],
            },
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Good points. Many educators believe that technology is changing how students learn. Do you think technology makes learning more effective or creates distractions? Please explain your reasoning.",
          hints: [
            {
              claim: "Technology can make learning more effective",
              examples: [
                "video tutorials",
                "interactive apps",
                "instant feedback",
              ],
            },
            {
              claim: "Screens can easily distract students",
              examples: [
                "social media",
                "multitasking",
                "notification overload",
              ],
            },
            {
              claim: "How tools are used matters most",
              examples: [
                "structured lessons",
                "teacher guidance",
                "time limits",
              ],
            },
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "Interesting perspective. Finally, many experts predict that artificial intelligence will become more common in education. Do you think this will be mostly helpful or mostly challenging for students? Why?",
          hints: [
            {
              claim: "AI could personalize learning",
              examples: [
                "adaptive practice",
                "instant tutoring",
                "translation support",
              ],
            },
            {
              claim: "AI may encourage shortcut thinking",
              examples: [
                "copying answers",
                "less critical thinking",
                "over-reliance on tools",
              ],
            },
            {
              claim: "Schools will need new rules",
              examples: [
                "academic honesty",
                "teacher training",
                "fair access",
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "custom-02",
    title: "Practice Test 6",
    subtitle: "Train station · Smartphone use",
    etsSource: "TOEFL Speaking Practice · Test 6",
    listenRepeat: {
      scenario:
        "You are learning how to welcome passengers to the train station. Listen to the speaker and repeat what she says. Repeat only once.",
      topic: "Transportation",
      sentences: [
        { text: "This is platform number four.", responseSeconds: 8 },
        { text: "The train is running on time.", responseSeconds: 8 },
        {
          text: "Tickets must be scanned before you board.",
          responseSeconds: 10,
        },
        {
          text: "Please stand behind the yellow line for safety.",
          responseSeconds: 10,
        },
        {
          text: "Announcements for delays will be made over the loudspeaker.",
          responseSeconds: 10,
        },
        {
          text: "If you are unsure about your train, ask a conductor for help.",
          responseSeconds: 12,
        },
        {
          text: "Baggage must be stored safely, and aisles should remain clear throughout the trip.",
          responseSeconds: 12,
        },
      ],
    },
    interview: {
      theme: "Smartphone Use",
      topic: "Technology",
      intro:
        "You have volunteered for a research study about your smartphone use. You will have a short online interview with a researcher. The researcher will ask you some questions.",
      questions: [
        {
          questionType: "personal_recall",
          prompt:
            "Thank you for joining the interview! To start, think about a recent time when your smartphone made your day easier or solved a problem. What happened, and why was the phone helpful in that situation?",
          hints: [
            {
              claim: "Navigation saved time",
              examples: [
                "maps app",
                "transit directions",
                "finding a new address",
              ],
            },
            {
              claim: "Communication solved a problem quickly",
              examples: ["texting a friend", "video call", "coordinating plans"],
            },
            {
              claim: "A utility app handled a task",
              examples: [
                "mobile payment",
                "banking transfer",
                "food delivery order",
              ],
            },
          ],
        },
        {
          questionType: "preference",
          prompt:
            "I see. Some people keep notifications on all the time to stay connected, while others silence most alerts to focus. Which approach do you prefer for your daily life, and why? Please mention one benefit and one drawback you consider.",
          hints: [
            {
              claim: "Notifications help me stay connected",
              examples: [
                "urgent messages",
                "calendar reminders",
                "family updates",
              ],
            },
            {
              claim: "Silencing alerts protects focus",
              examples: ["deep work", "studying", "better sleep"],
            },
            {
              claim: "I try to balance both",
              examples: [
                "focus mode",
                "VIP contacts only",
                "scheduled quiet hours",
              ],
            },
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Interesting. Many people suggest setting aside the phone at least one hour each day. Do you think this practice meaningfully improves well-being or productivity for most people? Why or why not? Support your answer with one or two reasons or examples.",
          hints: [
            {
              claim: "A daily break can improve well-being",
              examples: [
                "less stress",
                "more face-to-face time",
                "better sleep habits",
              ],
            },
            {
              claim: "Productivity may rise without constant checking",
              examples: [
                "fewer interruptions",
                "longer focus blocks",
                "clearer priorities",
              ],
            },
            {
              claim: "Not everyone can unplug easily",
              examples: [
                "work on-call duties",
                "family emergencies",
                "online classes",
              ],
            },
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "Good points. Finally, many people think app designers should make smartphones less addictive, for example by limiting endless scrolling or autoplay. Do you think these design changes would be mostly helpful or mostly harmful for users? Why?",
          hints: [
            {
              claim: "Limits could protect users",
              examples: [
                "screen-time caps",
                "fewer autoplay videos",
                "healthier habits",
              ],
            },
            {
              claim: "Users should choose for themselves",
              examples: [
                "personal responsibility",
                "optional settings",
                "freedom of use",
              ],
            },
            {
              claim: "Design changes may have trade-offs",
              examples: [
                "less convenience",
                "slower discovery",
                "business pushback",
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "custom-03",
    title: "Practice Test 7",
    subtitle: "Campus parking · University chorus",
    etsSource: "TOEFL Speaking Practice · Test 7",
    listenRepeat: {
      scenario:
        "You are learning to introduce students to the campus parking lot. Listen to the speaker and repeat what she says. Repeat only once.",
      topic: "Campus Life",
      sentences: [
        { text: "Welcome to the campus parking lot.", responseSeconds: 8 },
        { text: "Display your parking permit.", responseSeconds: 8 },
        {
          text: "The parking garage is on the north side of campus.",
          responseSeconds: 10,
        },
        {
          text: "Accessible parking spots are reserved near the entrance.",
          responseSeconds: 10,
        },
        {
          text: "Temporary parking rates are posted on the sign.",
          responseSeconds: 10,
        },
        {
          text: "Visit the security office to apply for a parking pass.",
          responseSeconds: 12,
        },
        {
          text: "Always lock your vehicle and note the overnight parking restrictions.",
          responseSeconds: 12,
        },
      ],
    },
    interview: {
      theme: "University Chorus",
      topic: "Culture",
      intro:
        "You're interested in participating in the university chorus. A professor from the music department will ask you some questions. You will have a short online interview with this professor. Please answer the interviewer's questions.",
      questions: [
        {
          questionType: "personal_recall",
          prompt:
            "Thank you for applying to the university chorus. First, describe any past musical experience, for example choir, solo singing, or playing instruments, and explain why you want to join our class.",
          hints: [
            {
              claim: "School choir built my foundation",
              examples: [
                "school concerts",
                "reading sheet music",
                "harmony practice",
              ],
            },
            {
              claim: "Playing an instrument helped my ear",
              examples: ["piano lessons", "guitar practice", "rhythm training"],
            },
            {
              claim: "I want to grow as a performer",
              examples: [
                "stage confidence",
                "team singing",
                "learn new genres",
              ],
            },
          ],
        },
        {
          questionType: "preference",
          prompt:
            "I see. Do you prefer listening to live music or recorded music? Why?",
          hints: [
            {
              claim: "Live music feels more energetic",
              examples: [
                "concert atmosphere",
                "crowd energy",
                "musician interaction",
              ],
            },
            {
              claim: "Recorded music is more convenient",
              examples: [
                "headphones anywhere",
                "replay favorite songs",
                "discover new artists online",
              ],
            },
            {
              claim: "Both offer different strengths",
              examples: [
                "studio quality",
                "emotional live moment",
                "affordable access",
              ],
            },
          ],
        },
        {
          questionType: "opinion",
          prompt:
            "Interesting. Do you agree or disagree with the following statement: art and music classes are just as important as science and math classes in a well-rounded education. Use details and examples to support your opinion.",
          hints: [
            {
              claim: "Arts classes develop creativity",
              examples: [
                "design thinking",
                "self-expression",
                "problem solving",
              ],
            },
            {
              claim: "STEM skills remain essential too",
              examples: [
                "job readiness",
                "logical reasoning",
                "technical literacy",
              ],
            },
            {
              claim: "A balanced schedule benefits students",
              examples: [
                "stress relief",
                "broader interests",
                "collaboration skills",
              ],
            },
          ],
        },
        {
          questionType: "policy_prediction",
          prompt:
            "Good points. Lastly, do you think schools should allocate more funds to improving art and music facilities, like better art studios or high-quality musical instruments? Explain your reasoning.",
          hints: [
            {
              claim: "Better facilities support talent",
              examples: [
                "quality instruments",
                "soundproof rooms",
                "exhibition space",
              ],
            },
            {
              claim: "Core academic needs come first",
              examples: [
                "science labs",
                "library resources",
                "teacher salaries",
              ],
            },
            {
              claim: "Partnerships can stretch budgets",
              examples: [
                "community donors",
                "rented equipment",
                "shared venues",
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "custom-04",
    title: "Practice Test 8",
    subtitle: "University library · Travel",
    etsSource: "TOEFL Speaking Practice · Test 8",
    listenRepeat: {
      scenario:
        "You are learning how to guide new students through the university library. Listen to the speaker and repeat what she says. Repeat only once.",
      topic: "Education",
      sentences: [
        { text: "Welcome to the university library.", responseSeconds: 8 },
        {
          text: "The self-checkout machines are on your left.",
          responseSeconds: 8,
        },
        {
          text: "Fiction books are on the first floor, near the windows.",
          responseSeconds: 10,
        },
        {
          text: "Study carrels and quiet zones are behind the main staircase.",
          responseSeconds: 10,
        },
        {
          text: "Reference books and printers are in the northeast corner of the second floor.",
          responseSeconds: 10,
        },
        {
          text: "If you need assistance, the librarian's desk is directly across from the entrance.",
          responseSeconds: 12,
        },
        {
          text: "Remember to return borrowed books to the drop-off box next to the exit on the second floor.",
          responseSeconds: 12,
        },
      ],
    },
    interview: {
      theme: "Travel Preferences",
      topic: "Travel",
      intro:
        "You have volunteered to take part in a research study about people's lives. You will have a short online interview with a researcher. The researcher will ask you some questions about travel.",
      questions: [
        {
          questionType: "preference",
          prompt:
            "When it comes to taking a vacation, do you have a preference for traveling during the winter months or the summer season?",
          hints: [
            {
              claim: "Summer travel suits outdoor plans",
              examples: ["beach trips", "hiking", "long daylight hours"],
            },
            {
              claim: "Winter trips can feel special",
              examples: ["ski resorts", "holiday markets", "fewer crowds"],
            },
            {
              claim: "It depends on destination and budget",
              examples: [
                "off-season deals",
                "school schedule",
                "weather at home",
              ],
            },
          ],
        },
        {
          questionType: "preference",
          prompt:
            "What kind of activities do you usually enjoy while on holiday? For instance, do you prefer relaxing on a beach, or do you enjoy leisurely exploring local streets and landmarks?",
          hints: [
            {
              claim: "I like relaxing getaways",
              examples: ["beach reading", "spa days", "slow mornings"],
            },
            {
              claim: "I prefer active exploration",
              examples: ["walking tours", "local food", "museums"],
            },
            {
              claim: "I mix rest and sightseeing",
              examples: [
                "one busy day",
                "one quiet day",
                "flexible itinerary",
              ],
            },
          ],
        },
        {
          questionType: "preference",
          prompt:
            "In terms of planning your time off, would you rather take frequent short trips throughout the year, or go on one extended vacation that lasts a much longer period?",
          hints: [
            {
              claim: "Short trips keep travel fresh",
              examples: [
                "weekend getaways",
                "less planning stress",
                "variety of places",
              ],
            },
            {
              claim: "One long trip allows deeper immersion",
              examples: [
                "language practice",
                "slow travel",
                "fewer transit days",
              ],
            },
            {
              claim: "Work and budget shape the choice",
              examples: ["limited PTO", "flight costs", "family obligations"],
            },
          ],
        },
        {
          questionType: "preference",
          prompt:
            "Do you prefer to independently plan the itinerary with your friends, or would you rather join an organized tour group managed by a travel agency?",
          hints: [
            {
              claim: "Independent planning offers freedom",
              examples: [
                "custom schedule",
                "local restaurants",
                "change plans anytime",
              ],
            },
            {
              claim: "Tour groups reduce hassle",
              examples: [
                "guided transport",
                "group discounts",
                "language support",
              ],
            },
            {
              claim: "The best fit depends on the trip",
              examples: [
                "unfamiliar country",
                "first-time visitors",
                "complex logistics",
              ],
            },
          ],
        },
      ],
    },
  },
];
