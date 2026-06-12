export type Contact = {
  label: string;
  href: string;
  external?: boolean;
};

export type Profile = {
  name: string;
  initials: string;
  title: string;
  affiliation: string;
  location: string;
  email: string;
  summary: string;
  focus: string[];
  contacts: Contact[];
};

export type ResearchArea = {
  title: string;
  summary: string;
  keywords: string[];
};

export type Publication = {
  year: string;
  title: string;
  venue: string;
  role: string;
  keywords: string[];
  links?: Contact[];
};

export type Experience = {
  date: string;
  organization: string;
  summary: string;
  highlights: string[];
};

export type Honor = {
  title: string;
};

export type ReferenceSite = {
  name: string;
  href: string;
  takeaway: string;
};

export const profile: Profile = {
  name: "Changjian Liu",
  initials: "CL",
  title: "Master Student, Peking University",
  affiliation: "Peking University",
  location: "Beijing, China",
  email: "cjliu25@stu.pku.edu.cn",
  summary:
    "I build learning systems for spatial intelligence, causal response estimation, and industrial decision-making. My work connects spatio-temporal big data, GeoAI, advertising algorithms, uplift modeling, and causal inference, with a focus on stable response laws under observational and non-stationary settings.",
  focus: [
    "Spatio-temporal big data",
    "GeoAI and spatial flow modeling",
    "Advertising algorithms",
    "Uplift modeling",
    "Causal inference",
    "Decision intelligence"
  ],
  contacts: [
    { label: "Email", href: "mailto:cjliu25@stu.pku.edu.cn" },
    { label: "GitHub", href: "https://github.com/Whitneylcj", external: true },
    {
      label: "Google Scholar",
      href: "https://scholar.google.com/citations?user=x3w5EG0AAAAJ&hl=zh-TW",
      external: true
    }
  ]
};

export const researchAreas: ResearchArea[] = [
  {
    title: "Spatial Intelligence",
    summary:
      "Spatio-temporal prediction, trajectory modeling, graph neural networks, spatial flow, and explainable spatial regression.",
    keywords: ["GeoAI", "mobility flow", "trajectory modeling"]
  },
  {
    title: "Causal Response Learning",
    summary:
      "Stable treatment-response estimation from non-stationary observational logs, orthogonal learning, and decision-oriented causal modeling.",
    keywords: ["uplift", "orthogonal learning", "non-stationarity"]
  },
  {
    title: "Industrial Decision Systems",
    summary:
      "Pricing, budget allocation, multi-treatment optimization, and robust policy design for online platforms.",
    keywords: ["pricing", "allocation", "policy optimization"]
  }
];

export const publications: Publication[] = [
  {
    year: "2025",
    title:
      "Integrating trajectory data and demographic characteristics: a trajectory semantic model for predicting travel flow and conducting interaction analysis",
    venue: "International Journal of Digital Earth",
    role: "First Author",
    keywords: ["graph neural networks", "spatio-temporal prediction", "mobility flow modeling"]
  },
  {
    year: "Under Review",
    title:
      "SH2EM: A Meta-Learning Framework for Explainable Spatial Regression via Global Homogeneity and Local Heterogeneity Modeling",
    venue: "Manuscript under review",
    role: "First Author",
    keywords: ["meta-learning", "small-sample prediction", "explainable spatial regression"]
  },
  {
    year: "2025",
    title:
      "VisitFrequency-Diffusion: Leveraging Recurrent Visits for Long-Term Individual Trajectory Forecasting",
    venue: "SIGSPATIAL '25",
    role: "Fourth Author",
    keywords: ["generative modeling", "human mobility", "long-horizon trajectory forecasting"]
  },
  {
    year: "Current",
    title: "Recovering stable treatment response from temporally non-stationary observational data",
    venue: "Planned submission to NeurIPS",
    role: "Lead project",
    keywords: ["causal inference", "non-RCT logs", "temporal non-stationarity", "response estimation"]
  }
];

export const experience: Experience[] = [
  {
    date: "2025.11 - Present",
    organization: "Alibaba / Alimama",
    summary:
      "Worked on managed marketing pricing and ad-equity uplift modeling for advertising decision systems.",
    highlights: [
      "Participated in cost optimization and downstream allocation design.",
      "Connected pricing response models with decision-facing evaluation."
    ]
  },
  {
    date: "2025.06 - 2025.10",
    organization: "Didi Chuxing",
    summary:
      "Modeled short-term LTV under coupon-package interventions and optimized personalized allocation under budget constraints.",
    highlights: [
      "Built personalized treatment allocation logic for coupon packages.",
      "Online A/B test reported +6% purchase rate and +3% ROI."
    ]
  }
];

export const honors: Honor[] = [
  { title: "National Scholarship" },
  { title: "Xiaomi Scholarship" },
  { title: "National Second Prize, China Undergraduate Mathematical Contest in Modeling" },
  { title: "National First Prize, China Computer Design Competition" },
  { title: "National Innovation Project Leader" },
  { title: "Outstanding Student / Outstanding Party Member / Outstanding Class Cadre" }
];

export const referenceSites: ReferenceSite[] = [
  {
    name: "Jon Barron",
    href: "https://jonbarron.info/",
    takeaway: "Dense but readable research list with clear project and paper links."
  },
  {
    name: "Deepak Pathak",
    href: "https://www.cs.cmu.edu/~dpathak/",
    takeaway: "Practical News section paired with representative publications."
  },
  {
    name: "Lilian Weng",
    href: "https://lilianweng.github.io/",
    takeaway: "Strong model for long-form research notes and technical writing."
  },
  {
    name: "Carl Vondrick",
    href: "https://www.cs.columbia.edu/~vondrick/",
    takeaway: "Clean academic structure with easy scanning across research outputs."
  },
  {
    name: "Andrej Karpathy",
    href: "https://karpathy.ai/",
    takeaway: "Minimal personal brand and concise entry points to deeper content."
  },
  {
    name: "Keunhong Park",
    href: "https://keunhong.com/",
    takeaway: "Modern young-researcher homepage with portfolio-like clarity."
  }
];
