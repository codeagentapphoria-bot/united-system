import { Calendar, FileText, Users, Home, Heart } from "lucide-react";
import { useBarangay } from "@/contexts/BarangayContext";

export function BarangayStats() {
  const { selectedBarangay, getBarangayStats } = useBarangay();

  const getDynamicStats = () => {
    if (!selectedBarangay) {
      return [
        {
          icon: Users,
          number: "0",
          label: "Registered Residents",
          description: "Select a barangay to view data",
        },
        {
          icon: FileText,
          number: "0",
          label: "Certificates Issued",
          description: "Select a barangay to view data",
        },
        {
          icon: Home,
          number: "0",
          label: "Households",
          description: "Select a barangay to view data",
        },
        {
          icon: Heart,
          number: "0",
          label: "Families",
          description: "Select a barangay to view data",
        },
      ];
    }

    // Get the stats for the selected barangay
    const stats = getBarangayStats(selectedBarangay.id);
    const population = stats.residents || 0;
    const households = stats.households || 0;
    const families = stats.families || 0;
    const completedCertificates = stats.completedCertificates || 0;

    return [
      {
        icon: Users,
        number: population.toLocaleString(),
        label: "Registered Residents",
        description: "Active community members",
      },
      {
        icon: FileText,
        number: completedCertificates.toLocaleString(),
        label: "Certificates Issued",
        description: "Successfully processed",
      },
      {
        icon: Home,
        number: households.toLocaleString(),
        label: "Households",
        description: "Registered households",
      },
      {
        icon: Heart,
        number: families.toLocaleString(),
        label: "Families",
        description: "Family units served",
      },
    ];
  };

  const stats = getDynamicStats();

  return (
    <section className="py-16 bg-gradient-to-br from-secondary/5 to-accent/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {selectedBarangay?.name || "Our Barangay"} by Numbers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See the impact of our digital transformation on{" "}
            {selectedBarangay?.name || "community"} services and engagement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-gradient-card rounded-xl p-6 text-center shadow-soft hover-lift animate-slide-up border-l-4 border-l-primary"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">
                  {stat.number}
                </div>
                <div className="text-lg font-medium text-foreground mb-1">
                  {stat.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
