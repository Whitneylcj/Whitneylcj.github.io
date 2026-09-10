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
  group?: "agents" | "decisions" | "spatial";
  shortName?: string;
  year: string;
  title: string;
  authors?: string;
  venue: string;
  role: string;
  summary: string;
  figure?: string;
  figureAlt?: string;
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
  role: string;
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
  title: "Master’s student, Peking University",
  affiliation: "Peking University",
  location: "Beijing, China",
  email: "cjliu25@stu.pku.edu.cn",
  summary:
    "I study how language-model agents learn from feedback, make decisions, and carry out tasks. My research interests span agentic reinforcement learning, LLM post-training, and decision making under constraints and distribution shift.",
  focus: ["Agentic RL", "LLM decision making", "LLM post-training", "Embodied agents", "Causal policy learning"],
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
    title: "Learning from interaction",
    summary: "How can an agent learn which decisions mattered over a long task? I study credit assignment, agentic reinforcement learning, and learning from experimental feedback.",
    keywords: ["Agentic RL", "LLM post-training", "Credit assignment"]
  },
  {
    title: "Making better decisions",
    summary: "How can learned policies stay useful under constraints and distribution shift? My work connects causal learning with decision objectives, from resource allocation to LLM agents.",
    keywords: ["LLM decision making", "Causal policy learning"]
  },
  {
    title: "Bringing reasoning into the world",
    summary: "How can robots reason about a task and carry it out? At Galbot, I am exploring agentic approaches to embodied reasoning and task execution.",
    keywords: ["Embodied agents", "Reasoning & execution"]
  }
];

export const publications: Publication[] = [
  {
    group: "agents",
    shortName: "EXACT",
    year: "Ongoing",
    title: "EXACT: EXecution-Aware Credit Assignment with Target Conservation",
    venue: "Ongoing research",
    role: "First author",
    summary: "Execution-aware credit assignment for long-horizon agents. The project uses local verification signals to connect feedback to relevant decisions while preserving the original reward objective, with a training pipeline built on verl.",
    keywords: ["Agentic RL", "Credit assignment", "Long-horizon tasks"]
  },
  {
    group: "agents",
    shortName: "AutoAttribRec",
    year: "2027",
    title: "AutoAttribRec: Attribution-Guided Self-Evolving Research for Recommender Systems",
    venue: "Submitted to AAAI 2027",
    role: "Fourth author",
    summary: "Helping research agents learn from experiments through attribution checks and hierarchical memory, so that verified insights can inform later tasks.",
    keywords: ["Research agents", "Self-evolving agents", "Experimental feedback"]
  },
  {
    group: "decisions",
    shortName: "ReAlloc",
    year: "2027",
    title: "Multi-channel Uplift Policy Learning",
    authors:
      "Changjian Liu, Tianyu Wang, Xiaoxuan Deng, Wentao Zhu, Yuwei Xu, Junqi Jin, Yong Gao, Chuan Yu, Jian Xu, Bo Zheng",
    venue: "Submitted to KDD 2027 Applied Data Science (ADS) Track",
    role: "First author",
    summary:
      "ReAlloc formulates fixed-budget multi-channel marketing as simplex-constrained uplift policy learning, combining an orthogonal teacher, explanation-guided student, and support-aware local reallocation for stable production decisions.",
    figure: "/assets/publications/multichannel-uplift-realloc.png",
    figureAlt:
      "Conceptual illustration of ReAlloc, contrasting local supported reallocation with unsafe global predict-then-optimize extrapolation.",
    featured: true,
    keywords: ["multi-channel uplift", "causal policy learning", "resource allocation"],
    links: [
      {
        label: "pdf",
        href: "/assets/publications/multichannel-uplift-policy-learning.pdf"
      },
      {
        label: "arXiv",
        href: "https://arxiv.org/abs/2607.28182",
        external: true
      }
    ]
  },
  {
    group: "decisions",
    shortName: "Causal Action Geometry",
    year: "2026",
    title:
      "Learning Deployable Causal Action Geometry under Temporal Non-Stationarity",
    venue: "Submitted to NeurIPS 2026",
    role: "First author",
    summary:
      "A causal response learning framework for continuous decisions under temporal drift, using anchored link-scale contrasts, orthogonal pilots, and profiled morphology selection to learn deployable action geometry.",
    figure: "/assets/publications/deployable-action-geometry.png",
    figureAlt:
      "Figure 1 from the NeurIPS submission, illustrating target mismatch under temporal drift and pooled action-response learning.",
    featured: true,
    keywords: ["causal action geometry", "temporal non-stationarity", "orthogonal learning"]
  },
  {
    group: "spatial",
    year: "2026",
    title:
      "OpFlow: Learning Opportunity-Conditioned Choice Potentials for Robust OD Flow Prediction",
    authors: "Changjian Liu, Yong Gao, Yuqing Wang, Leyi Su, Honglei Guo, Zhiyang Wang, Xiaoyu Wang, Fan Zhang",
    venue: "arXiv preprint; submitted to AAAI 2027",
    role: "First author",
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
    group: "spatial",
    year: "2024",
    title:
      "Integrating trajectory data and demographic characteristics: a trajectory semantic model for predicting travel flow and conducting interaction analysis",
    authors: "Changjian Liu, Shuhui Gong, Hui Su, Jianwei Chen, Honglei Guo, Jifeng He, Changfeng Jing, Yu Liu",
    venue: "International Journal of Digital Earth 17(1), 2392842",
    role: "First author",
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
    group: "spatial",
    year: "2026",
    title:
      "High precision prediction of time-varying photovoltaic power based on dynamic adjacency matrix and temporal spectral graph convolution network",
    authors: "Honglei Guo, Zhenchan Su, Zhiwei Wang, Guiren Zhan, Changjian Liu, Ling Bu",
    venue: "Energy Conversion and Management: X 30, 101676",
    role: "Fifth author",
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
    group: "spatial",
    year: "2025",
    title:
      "VisitFrequency-Diffusion: Leveraging Recurrent Visits for Long-Term Individual Trajectory Forecasting",
    authors: "Ziyan Yang, Shuhui Gong, Xinqi Liu, Jiahao Lv, Changjian Liu, Jilin Hu, Hongbin Pei",
    venue: "Proceedings of the 33rd ACM International Conference on Advances in Geographic Information Systems, 1190-1193",
    role: "Fifth author",
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
  },
  {
    group: "decisions",
    shortName: "ROI–Uplift Frontier",
    year: "2027",
    title: "Anchor-Regularized Advertising ROI-Uplift Frontier Learning",
    venue: "Submitted to KDD 2027",
    role: "First author",
    summary: "Research on anchor-regularized ROI–uplift frontier learning for advertising decisions.",
    keywords: ["Causal decision making", "Advertising"]
  },
  {
    group: "spatial",
    year: "Under review",
    title: "SH2EM: A Meta-Learning Framework for Explainable Spatial Regression via Global Homogeneity and Local Heterogeneity Modeling",
    venue: "International Journal of Geographical Information Science · Minor revision",
    role: "First author",
    summary: "Explainable spatial regression combining global homogeneity and local heterogeneity through meta-learning.",
    keywords: ["Meta-learning", "Explainable regression"]
  },
  {
    group: "spatial",
    year: "2026",
    title: "VEGAR: A tourist attraction recommender system based on signed feedback and a signed spatial-sentiment knowledge graph",
    venue: "Journal of King Saud University – Science",
    role: "Fourth author",
    summary: "Tourist attraction recommendation with signed feedback and a spatial-sentiment knowledge graph.",
    keywords: ["Recommendation", "Knowledge graphs"],
    links: [{ label: "Paper", href: "https://link.springer.com/article/10.1007/s44443-026-01048-z", external: true }]
  }
];

export const experience: Experience[] = [
  {
    date: "Sep 2026 – Present",
    organization: "Galbot",
    role: "Research internship · Embodied intelligence brain",
    summary: "Working on agentic approaches to robot reasoning and task execution, exploring how robots can think through tasks and translate decisions into actions.",
    highlights: ["Embodied agents", "Reasoning & execution"]
  },
  {
    date: "Nov 2025 – Jun 2026",
    organization: "Alibaba · Taotian Group · Alimama",
    role: "LLM Algorithm Intern",
    summary: "Worked on agentic reinforcement learning, self-evolving research agents, and causal decision systems. Projects covered execution-aware credit assignment, experimental attribution, pricing, and constrained multi-channel allocation.",
    highlights: ["Agentic RL", "Causal decision systems"]
  },
  {
    date: "Jun 2025 – Oct 2025",
    organization: "Didi · International Business",
    role: "Advertising Algorithm Intern",
    summary: "Developed models for personalized coupon allocation, combining purchase, redemption, and short-term value prediction with uncertainty-aware treatment modeling and budget-constrained optimization.",
    highlights: ["Treatment allocation", "Constrained optimization"]
  }
];

export const education = [
  { date: "2025 – 2028 (expected)", organization: "Peking University", degree: "Master’s in Spatio-Temporal Big Data" },
  { date: "2021 – 2025", organization: "China University of Geosciences, Beijing", degree: "Bachelor’s in Computer Science and Technology" }
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
