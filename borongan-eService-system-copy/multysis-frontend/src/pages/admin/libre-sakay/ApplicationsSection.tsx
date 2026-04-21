import { ProgramApplicationsTab } from '@/components/social-amelioration';
import { Card, CardContent } from '@/components/ui/card';

export function ApplicationsSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <ProgramApplicationsTab programId="gp-all-libre-sakay" initialStatus="" />
        </CardContent>
      </Card>
    </div>
  );
}
