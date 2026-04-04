// Helper to capitalize first letter
export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

// Helper to format date as 'Month Day, Year'
export const formatDateLong = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
// Helper to calculate age
export const getAge = (dateStr) => {
  if (!dateStr) return "-";
  const today = new Date();
  const birth = new Date(dateStr);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};
// Helper to format keys like 'College_student' to 'College Student'
export const formatLabel = (str) => {
  const safeStr = str === undefined || str === null ? "-" : String(str);
  return safeStr
    .replace(/_/g, " ")
    .replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

// Helper to get detail label from classificationOptions
export const getDetailLabel = (type, key, classificationOptions = []) => {
  const opt = classificationOptions.find(
    (o) =>
      formatLabel(o.label) === formatLabel(type) ||
      formatLabel(o.key) === formatLabel(type)
  );
  if (!opt || !opt.details) return formatLabel(key);
  const detail = opt.details.find((d) => d.key === key);
  return detail ? detail.label : formatLabel(key);
};
