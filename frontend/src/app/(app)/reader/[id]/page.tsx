import ReaderView from "./ReaderView";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function ReaderPage() {
  return <ReaderView />;
}
