import BayeganiRecordForm from "@/components/BayeganiRecordForm";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditBayeganiRecordPage({ params }: PageProps) {
  const { id } = await params;
  return <BayeganiRecordForm recordId={id} />;
}
