// The fixed analysis results. No AI is called: uploading a resume with one of these names
// always gives that result, whatever the job description says.
//
// name:   matched against the resume's file name, ignoring upper/lower case, the .pdf/.docx/.txt
//         extension, and whether words are split by spaces, underscores or hyphens. So
//         "Nour_Hassan.pdf", "nour-hassan.docx" and "Nour Hassan.txt" all match "Nour Hassan".
// match_score:          0 to 100
// keyword_gaps:         missing keywords. category: skill | tool | qualification | other,
//                       importance: whole number 1 to 5 (5 = critical). Up to 30.
// rewrite_suggestions:  section: summary | experience | skills | education. Up to 10.
//
// The server checks this file when it starts and refuses to start if an entry is invalid.

export const FIXED_RESULTS = [
  {
    name: 'Nour Hassan',
    match_score: 67,
    keyword_gaps: [
      { keyword: 'Power BI', category: 'tool', importance: 4 },
      { keyword: 'Tableau', category: 'tool', importance: 3 },
      { keyword: 'Stakeholder reporting', category: 'skill', importance: 2 },
      { keyword: 'A/B testing', category: 'skill', importance: 2 },
    ],
    rewrite_suggestions: [
      {
        section: 'skills',
        original_text: 'Skills: Python, SQL, Excel, Git',
        suggested_text: 'Skills: Python, SQL, Excel, Power BI, Tableau, Data visualization, Git',
      },
      {
        section: 'experience',
        original_text: 'Made weekly sales reports for the team.',
        suggested_text: 'Built weekly sales dashboards in Excel and presented results to 4 stakeholders, cutting reporting time by 30%.',
      },
      {
        section: 'summary',
        original_text: 'Computer science graduate looking for a data job.',
        suggested_text: 'Computer science graduate with SQL and Python skills, seeking a Junior Data Analyst role in reporting and A/B testing.',
      },
    ],
  },
  {
    name: 'Mostafa Ahmed',
    match_score: 54,
    keyword_gaps: [
      { keyword: 'SQL', category: 'skill', importance: 5 },
      { keyword: 'Python', category: 'skill', importance: 5 },
      { keyword: 'Excel', category: 'tool', importance: 4 },
      { keyword: 'Power BI', category: 'tool', importance: 4 },
      { keyword: 'Statistics', category: 'qualification', importance: 3 },
      { keyword: 'Tableau', category: 'tool', importance: 3 },
    ],
    rewrite_suggestions: [
      {
        section: 'experience',
        original_text: 'Ran 2 social media campaigns reaching 5,400 students.',
        suggested_text: 'Ran 2 social media campaigns reaching 5,400 students, tracking reach and engagement in Google Analytics and reporting results each week.',
      },
      {
        section: 'skills',
        original_text: 'Skills: Canva, Google Analytics, copywriting',
        suggested_text: 'Skills: Google Analytics, campaign reporting, Canva, copywriting',
      },
    ],
  },
  {
    name: 'Youssef Khaled',
    match_score: 41,
    keyword_gaps: [
      { keyword: 'SQL', category: 'skill', importance: 5 },
      { keyword: 'Python', category: 'skill', importance: 5 },
      { keyword: 'Power BI', category: 'tool', importance: 4 },
      { keyword: 'Data visualization', category: 'skill', importance: 4 },
      { keyword: 'Statistics', category: 'qualification', importance: 3 },
      { keyword: 'Git', category: 'tool', importance: 1 },
    ],
    rewrite_suggestions: [
      {
        section: 'summary',
        original_text: 'Fresh graduate with internship and volunteering experience.',
        suggested_text: 'Fresh graduate with internship and volunteering experience, looking for a Junior Data Analyst role building reports in Excel.',
      },
      {
        section: 'skills',
        original_text: 'Skills: Microsoft Office, teamwork, English and Arabic',
        suggested_text: 'Skills: Microsoft Excel, Word and PowerPoint, teamwork, English and Arabic',
      },
    ],
  },
];
