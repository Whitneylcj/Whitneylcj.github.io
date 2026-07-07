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
  authors: string;
  venue: string;
  role: string;
  summary: string;
  figure: string;
  figureAlt: string;
  featured?: boolean;
  keywords: string[];
  links?: PublicationLink[];
};

export type PublicationLink = {
  label: string;
  href?: string;
  external?: boolean;
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
    year: "2026",
    title:
      "Learning Deployable Causal Action Geometry under Temporal Non-Stationarity",
    authors: "Authors withheld for double-blind review",
    venue: "Submitted to NeurIPS 2026",
    role: "Submission under review",
    summary:
      "A causal response learning framework for continuous decisions under temporal drift, using anchored link-scale contrasts, orthogonal pilots, and profiled morphology selection to learn deployable action geometry.",
    figure: "/assets/publications/deployable-action-geometry.png",
    figureAlt:
      "Figure 1 from the NeurIPS submission, illustrating target mismatch under temporal drift and pooled action-response learning.",
    featured: true,
    keywords: ["causal action geometry", "temporal non-stationarity", "orthogonal learning"]
  },
  {
    year: "2026",
    title:
      "OpFlow: Learning Opportunity-Conditioned Choice Potentials for Robust OD Flow Prediction",
    authors: "Changjian Liu, Yong Gao, Yuqing Wang, Leyi Su, Honglei Guo, Zhiyang Wang, Xiaoyu Wang, Fan Zhang",
    venue: "arXiv preprint, arXiv:2607.03200",
    role: "First Author",
    summary:
      "A mechanism-constrained framework for robust origin-destination flow prediction that learns row-centered choice potentials and separates transferable allocation laws from origin demand scale.",
    figure: "/assets/publications/opflow-arxiv-preview.png",
    figureAlt:
      "First-page preview of the OpFlow arXiv preprint, showing the paper title, author list, and abstract.",
    featured: true,
    keywords: ["OD flow prediction", "choice potentials", "distribution shift"],
    links: [
      {
        label: "arXiv",
        href: "https://arxiv.org/abs/2607.03200",
        external: true
      },
      {
        label: "pdf",
        href: "https://arxiv.org/pdf/2607.03200",
        external: true
      }
    ]
  },
  {
    year: "2024",
    title:
      "Integrating trajectory data and demographic characteristics: a trajectory semantic model for predicting travel flow and conducting interaction analysis",
    authors: "Changjian Liu, Shuhui Gong, Hui Su, Jianwei Chen, Honglei Guo, Jifeng He, Changfeng Jing, Yu Liu",
    venue: "International Journal of Digital Earth 17(1), 2392842",
    role: "First Author",
    summary:
      "A trajectory semantic modeling framework that combines movement traces with demographic structure for travel-flow prediction and interaction analysis.",
    figure: "/assets/publications/trajectory-semantic-flow.png",
    figureAlt:
      "Figure from the trajectory semantic model paper, showing spatial dependence modelling and temporal dependence modelling.",
    featured: true,
    keywords: ["graph neural networks", "spatio-temporal prediction", "mobility flow modeling"],
    links: [
      {
        label: "webpage",
        href: "https://www.tandfonline.com/doi/abs/10.1080/17538947.2024.2392842",
        external: true
      },
      {
        label: "pdf",
        href: "https://www.tandfonline.com/doi/pdf/10.1080/17538947.2024.2392842",
        external: true
      },
      {
        label: "scholar",
        href: "https://scholar.google.com/citations?view_op=view_citation&hl=zh-TW&user=x3w5EG0AAAAJ&citation_for_view=x3w5EG0AAAAJ:u5HHmVD_uO8C",
        external: true
      }
    ]
  },
  {
    year: "2026",
    title:
      "High precision prediction of time-varying photovoltaic power based on dynamic adjacency matrix and temporal spectral graph convolution network",
    authors: "Honglei Guo, Zhenchan Su, Zhiwei Wang, Guiren Zhan, Changjian Liu, Ling Bu",
    venue: "Energy Conversion and Management: X 30, 101676",
    role: "Co-Author",
    summary:
      "A dynamic graph forecasting model for time-varying photovoltaic power prediction under volatile renewable-energy generation patterns.",
    figure: "/assets/publications/photovoltaic-graph-forecast.jpg",
    figureAlt:
      "Figure 1 from the photovoltaic power forecasting paper, showing the workflow and schematic diagram of the proposed model.",
    keywords: ["graph neural networks", "photovoltaic forecasting", "dynamic adjacency"],
    links: [
      {
        label: "webpage",
        href: "https://www.sciencedirect.com/science/article/pii/S2590174526001595",
        external: true
      },
      {
        label: "scholar",
        href: "https://scholar.google.com/citations?view_op=view_citation&hl=zh-TW&user=x3w5EG0AAAAJ&citation_for_view=x3w5EG0AAAAJ:9yKSN-GCB0IC",
        external: true
      }
    ]
  },
  {
    year: "2025",
    title:
      "VisitFrequency-Diffusion: Leveraging Recurrent Visits for Long-Term Individual Trajectory Forecasting",
    authors: "Ziyan Yang, Shuhui Gong, Xinqi Liu, Jiahao Lv, Changjian Liu, Jilin Hu, Hongbin Pei",
    venue: "Proceedings of the 33rd ACM International Conference on Advances in Geographic Information Systems, 1190-1193",
    role: "Co-Author",
    summary:
      "A generative trajectory forecasting study that uses recurrent visit patterns to improve long-horizon individual mobility prediction.",
    figure: "/assets/publications/visitfrequency-diffusion.png",
    figureAlt:
      "Figure from the VisitFrequency-Diffusion paper, showing diffusion-based trajectory generation and trajectory refinement.",
    featured: true,
    keywords: ["generative modeling", "human mobility", "long-horizon trajectory forecasting"],
    links: [
      {
        label: "webpage",
        href: "https://dl.acm.org/doi/abs/10.1145/3748636.3763227",
        external: true
      },
      {
        label: "pdf",
        href: "https://dl.acm.org/doi/pdf/10.1145/3748636.3763227",
        external: true
      },
      {
        label: "scholar",
        href: "https://scholar.google.com/citations?view_op=view_citation&hl=zh-TW&user=x3w5EG0AAAAJ&citation_for_view=x3w5EG0AAAAJ:d1gkVwhDpl0C",
        external: true
      }
    ]
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
