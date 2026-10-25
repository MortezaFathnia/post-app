export type TemplateDefinition = {
  id: string;
  title: string;
  description: string;
  file: string;
};

export type ContractTemplateSet = {
  id: string;
  title: string;
  templates: TemplateDefinition[];
};

export const contractTemplateSets: ContractTemplateSet[] = [
  {
    id: "MORABAHA",
    title: "مرابحه",
    templates: [
      {
        id: "request",
        title: "درخواست",
        description: "فرم درخواست تسهیلات مرابحه",
        file: "request.html",
      },
      {
        id: "contract",
        title: "قرارداد",
        description: "قرارداد مرابحه",
        file: "contract.html",
      },
      {
        id: "commitment",
        title: "تعهدنامه",
        description: "تعهدنامه مرتبط با قرارداد مرابحه",
        file: "commitment.html",
      },
    ],
  },

  {
    id: "CREDIT_CARD",
    title: "مرابحه کارت اعتباری",
    templates: [
      {
        id: "contract",
        title: "قرارداد",
        description: "قرارداد مرابحه کارت اعتباری",
        file: "contract.html",
      },
      {
        id: "commitment",
        title: "تعهدنامه",
        description: "تعهدنامه مرابحه کارت اعتباری",
        file: "commitment.html",
      },
    ],
  },

  {
    id: "DEBT_DISCOUNTING",
    title: "خرید دین",
    templates: [
      {
        id: "contract",
        title: "قرارداد",
        description: "قرارداد خرید دین",
        file: "contract.html",
      },
    ],
  },
];

export function getContractTemplateSet(
  contractType: string,
): ContractTemplateSet | undefined {
  return contractTemplateSets.find(
    (item) => item.id === contractType,
  );
}

export function getContractTemplate(
  contractType: string,
  templateId: string,
): TemplateDefinition | undefined {
  const templateSet =
    getContractTemplateSet(contractType);

  return templateSet?.templates.find(
    (template) => template.id === templateId,
  );
}