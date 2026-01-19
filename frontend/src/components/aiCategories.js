const categories = {
  'User Progress & Courses': {
    questions: [
      'How many courses have I completed?',
      'Can you show my progress in the Web Development course?',
      'How can I improve faster in the Data Structures course?',
      'What should I study next after Introduction to AI?',
      'Can you help me understand a topic from my course?'
    ],
    answers: {
      'How many courses have I completed?': 'You have completed 5 courses so far.',
      'Can you show my progress in the Web Development course?': 'You have completed 80% of the Web Development course. Keep up the good work!',
      'How can I improve faster in the Data Structures course?': 'Practice daily coding problems on platforms like LeetCode and review the course materials regularly.',
      'What should I study next after Introduction to AI?': 'Consider taking Advanced Machine Learning or Deep Learning courses.',
      'Can you help me understand a topic from my course?': 'Sure! Please specify the topic, and I\'ll explain it.'
    }
  },
  'Live Classes': {
    questions: [
      'When is my next Mathematics class?',
      'Can you remind me before my Physics live class starts?',
      'Can you join me to the Chemistry class?',
      'What are my live classes this week?'
    ],
    answers: {
      'When is my next Mathematics class?': 'Your next Mathematics class is on Tuesday at 10 AM.',
      'Can you remind me before my Physics live class starts?': 'I can set a reminder. Your Physics class is on Wednesday at 2 PM.',
      'Can you join me to the Chemistry class?': 'I\'m an AI, so I can\'t join live classes, but I can help with questions afterward.',
      'What are my live classes this week?': 'This week: Math (Tue 10AM), Physics (Wed 2PM), Chemistry (Fri 11AM).'
    }
  },
  'Leaderboard': {
    questions: [
      'How is the leaderboard score calculated?',
      'How can I increase my leaderboard points?',
      'Why is Shweta tied with me?',
      'Who is ranked 3rd and by how many points?'
    ],
    answers: {
      'How is the leaderboard score calculated?': 'Scores are based on course completions, quiz scores, and activity points.',
      'How can I increase my leaderboard points?': 'Complete more courses, score high on quizzes, and participate actively.',
      'Why is Shweta tied with me?': 'You both have the same total points from recent activities.',
      'Who is ranked 3rd and by how many points?': 'Rahul is ranked 3rd, 50 points behind you.'
    }
  },
  'Achievements': {
    questions: [
      'How can I earn more achievements?',
      'What is the \'Fast Learner\' badge?',
      'How can I get Perfect Attendance?',
      'Show me all my achievements.'
    ],
    answers: {
      'How can I earn more achievements?': 'Complete challenges, attend all classes, and excel in quizzes.',
      'What is the \'Fast Learner\' badge?': 'Earned by completing a course in record time.',
      'How can I get Perfect Attendance?': 'Attend all scheduled live classes without missing any.',
      'Show me all my achievements.': 'You have: Fast Learner, Perfect Attendance, Quiz Master, and Course Completer badges.'
    }
  },
  'AI Tutor Help': {
    questions: [
      'Can you explain any topic from my course?',
      'Can you solve a math or coding problem for me?',
      'I am struggling with Web Development. Can you teach me?',
      'Give me a study plan for completing all my courses.',
      'Can you summarize my last lesson?'
    ],
    answers: {
      'Can you explain any topic from my course?': 'Yes! What topic would you like explained?',
      'Can you solve a math or coding problem for me?': 'Sure, provide the problem, and I\'ll help.',
      'I am struggling with Web Development. Can you teach me?': 'Let\'s start with basics: HTML, CSS, JS. What specific part?',
      'Give me a study plan for completing all my courses.': 'Week 1-2: Focus on basics. Week 3-4: Advanced topics. Week 5: Projects.',
      'Can you summarize my last lesson?': 'Your last lesson was on Data Structures: Arrays and Linked Lists.'
    }
  },
  'Profile / General Dashboard': {
    questions: [
      'How many total hours have I learned?',
      'What new batch starts are coming soon?',
      'Show me my full profile.',
      'Can you analyze my performance and suggest improvements?'
    ],
    answers: {
      'How many total hours have I learned?': 'You have learned 120 hours so far.',
      'What new batch starts are coming soon?': 'New batches for AI and Data Science start next month.',
      'Show me my full profile.': 'Name: John Doe, Courses: 5 completed, Hours: 120, Rank: 2nd.',
      'Can you analyze my performance and suggest improvements?': 'You\'re strong in theory. Focus more on practical coding.'
    }
  },
  'Help / Support': {
    questions: [
      'I can’t access one of my courses. Can you help?',
      'My progress is not updating—what should I do?',
      'How do I change my email/password/profile picture?',
      'How do I download my performance report?'
    ],
    answers: {
      'I can’t access one of my courses. Can you help?': 'Check your internet or contact support at support@example.com.',
      'My progress is not updating—what should I do?': 'Refresh the page or clear cache. If persists, report to support.',
      'How do I change my email/password/profile picture?': 'Go to Settings > Profile and update accordingly.',
      'How do I download my performance report?': 'In your dashboard, click Reports > Download PDF.'
    }
  }
};

export default categories;
