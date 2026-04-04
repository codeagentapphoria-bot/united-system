import { useMemo } from "react";
import { formatLabel } from "@/utils/dashboardUtils";
import { pieColors } from "@/constants/dashboardConstants";

export const useChartData = (demographics) => {
  const prepareGenderData = useMemo(() => {
    if (!demographics.gender || demographics.gender.length === 0) {
      return [];
    }
    return demographics.gender.map((item, index) => ({
      name: formatLabel(item.sex),
      value: parseInt(item.count) || 0,
      fill: pieColors[index % pieColors.length],
    }));
  }, [demographics.gender]);

  const prepareAgeData = useMemo(() => {
    if (!demographics.age || demographics.age.length === 0) {
      return [];
    }
    return demographics.age.map((item, index) => ({
      name: item.age_group,
      value: parseInt(item.count) || 0,
      fill: pieColors[index % pieColors.length],
    }));
  }, [demographics.age]);

  const prepareCivilStatusData = useMemo(() => {
    if (!demographics.civilStatus || demographics.civilStatus.length === 0) {
      return [];
    }
    return demographics.civilStatus.map((item, index) => ({
      name: formatLabel(item.civil_status),
      value: parseInt(item.count) || 0,
      fill: pieColors[index % pieColors.length],
    }));
  }, [demographics.civilStatus]);

  const prepareEducationData = useMemo(() => {
    if (!demographics.education || demographics.education.length === 0) {
      return [];
    }

    return demographics.education.map((item) => ({
      name: formatLabel(item.education_attainment),
      value: parseInt(item.count) || 0,
    }));
  }, [demographics.education]);

  const prepareEmploymentData = useMemo(() => {
    if (!demographics.employment || demographics.employment.length === 0) {
      return [];
    }

    return demographics.employment.map((item) => ({
      name: formatLabel(item.employment_status),
      value: parseInt(item.count) || 0,
    }));
  }, [demographics.employment]);

  const prepareClassificationData = useMemo(() => {
    if (
      !demographics.classifications ||
      demographics.classifications.length === 0
    ) {
      return [];
    }
    // Filter out voters from classifications since they have their own tab
    const filteredClassifications = demographics.classifications.filter(
      (item) => item.classification_type !== "Voter"
    );

    return filteredClassifications.map((item, index) => ({
      name: item.classification_type,
      value: parseInt(item.count) || 0,
      fill: pieColors[index % pieColors.length],
    }));
  }, [demographics.classifications]);

  const prepareVoterData = useMemo(() => {
    if (!demographics.voters || demographics.voters.length === 0) {
      return [];
    }
    return demographics.voters.map((item, index) => ({
      name: item.voter_type || item.classification_type || "Voters",
      value: parseInt(item.count) || 0,
      fill: pieColors[index % pieColors.length],
    }));
  }, [demographics.voters]);

  return {
    prepareGenderData,
    prepareAgeData,
    prepareCivilStatusData,
    prepareEducationData,
    prepareEmploymentData,
    prepareClassificationData,
    prepareVoterData,
  };
};
