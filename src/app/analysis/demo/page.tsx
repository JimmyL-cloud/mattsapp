import { permanentRedirect } from 'next/navigation';

export default function LegacyDemoAnalysisPage() {
  permanentRedirect('/history');
}
