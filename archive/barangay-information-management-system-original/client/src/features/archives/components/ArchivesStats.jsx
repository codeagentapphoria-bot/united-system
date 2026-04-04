import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Archive, 
  FileText,
  Calendar,
  Clock
} from "lucide-react";
import { format } from "date-fns";

const ArchivesStats = ({ archives = [] }) => {
  const totalDocuments = archives.length;
  
  // Document type distribution
  const documentTypeStats = archives.reduce((acc, archive) => {
    const type = archive.document_type || 'Other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Documents added today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const documentsAddedToday = archives.filter(archive => {
    const archiveDate = new Date(archive.created_at);
    archiveDate.setHours(0, 0, 0, 0);
    return archiveDate.getTime() === today.getTime();
  });

  // Recent documents (last 7 days) - for display
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentDocuments = archives
    .filter(archive => {
      const archiveDate = new Date(archive.created_at);
      return archiveDate >= sevenDaysAgo;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 1);

  // Documents with images
  const documentsWithImages = archives.filter(archive => archive.file_path).length;

  // Get top 3 document types
  const topDocumentTypes = Object.entries(documentTypeStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 gap-6 mb-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          <Archive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="sm:pt-0">
          <div className="text-2xl font-bold">{totalDocuments}</div>
          <p className="text-xs text-muted-foreground">
            Archive documents
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Documents</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="sm:pt-0">
          <div className="space-y-2">
            {recentDocuments.length > 0 ? (
              <>
                <div className="text-xs text-muted-foreground mb-2">
                  {documentsAddedToday.length} added today
                </div>
                {recentDocuments.map((archive) => (
                  <div key={archive.archive_id} className="flex items-center justify-between">
                    <span className="text-sm truncate">{archive.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(archive.created_at), "MM/dd/yyyy")}
                    </Badge>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No recent documents</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchivesStats;
