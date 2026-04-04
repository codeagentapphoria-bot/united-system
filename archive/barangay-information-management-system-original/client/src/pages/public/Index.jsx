import { HeroSection } from "@/components/common/HeroSection";
import { Layout } from "@/components/common/Layout";
import { BarangayStats } from "@/components/common/BarangayStats";
import { FeaturesSection } from "@/components/common/FeaturesSection";
import { PWAInstallButton } from "./PWAInstallButton";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <BarangayStats />
      <FeaturesSection />
      <PWAInstallButton />
    </Layout>
  );
};

export default Index;
