type Organization = {
  name: string;
  href: string;
  images: { src: string; width: number; height: number; viewBox?: string }[];
};

export const organizations = {
  pku: {
    name: "Peking University", href: "https://english.pku.edu.cn/",
    images: [{ src: "pku.png", width: 1702, height: 479, viewBox: "0 0 479 479" }]
  },
  irsgis: {
    name: "Institute of Remote Sensing and Geographic Information Systems", href: "https://irsgis.pku.edu.cn/english/index.htm",
    images: [{ src: "irsgis.png", width: 659, height: 75, viewBox: "0 0 75 75" }]
  },
  galbot: {
    name: "Galbot", href: "https://www.galbot.com/",
    images: [{ src: "galbot.gif", width: 128, height: 128 }]
  },
  alibaba: {
    name: "Alibaba", href: "https://www.alibabagroup.com/",
    images: [{ src: "alibaba.png", width: 2072, height: 266, viewBox: "0 0 416 266" }]
  },
  taotian: {
    name: "Taobao & Tmall Group", href: "https://www.alibabagroup.com/en-US/about-alibaba-businesses",
    images: [{ src: "taobao.png", width: 114, height: 114 }, { src: "tmall.png", width: 16, height: 16 }]
  },
  alimama: {
    name: "Alimama", href: "https://www.alimama.com/",
    images: [{ src: "alimama.png", width: 50, height: 50 }]
  },
  didi: {
    name: "DiDi", href: "https://www.didiglobal.com/",
    images: [{ src: "didi.svg", width: 38, height: 38 }]
  },
  cugb: {
    name: "China University of Geosciences, Beijing", href: "https://en.cugb.edu.cn/",
    images: [{ src: "cugb.png", width: 913, height: 935 }]
  }
} satisfies Record<string, Organization>;

export type OrganizationId = keyof typeof organizations;
export function getOrganization(id: OrganizationId): Organization { return organizations[id]; }
