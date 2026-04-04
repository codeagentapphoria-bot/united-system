export const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];
export const civilStatusOptions = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "divorced", label: "Divorced" },
  { value: "live_in", label: "Live In" },
];
export const employmentStatusOptions = [
  { value: "employed", label: "Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
  { value: "not_applicable", label: "Not Applicable" },
];
export const educationAttainmentOptions = [
  { value: "primary_school", label: "Primary School" },
  { value: "elementary_graduate", label: "Elementary Graduate" },
  { value: "high_school_graduate", label: "High School Graduate" },
  { value: "college_graduate", label: "College Graduate" },
  { value: "post_graduate", label: "Post Graduate" },
  { value: "vocational", label: "Vocational" },
  { value: "none", label: "None" },
];
export const residentStatusOptions = [
  { value: "active", label: "Active" },
  { value: "deceased", label: "Deceased" },
  { value: "moved_out", label: "Moved Out" },
  { value: "temporarily_away", label: "Temporarily Away" },
];
export const indigenousPersonOptions = [
  { value: "No", label: "No" },
  { value: "Yes", label: "Yes" },
];
export const classificationOptions = [
  {
    key: "student",
    label: "Student",
    details: [
      { key: "educationLevel", label: "Education Level", type: "text" },
      { key: "gradeLevel", label: "Grade Level", type: "text" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "college_student",
    label: "College Student",
    details: [
      { key: "collegeLevel", label: "College Level", type: "text" },
      { key: "course", label: "Course", type: "text" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "farmer",
    label: "Farmer",
    details: [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "Land Owner", label: "Land Owner" },
          { value: "Rental", label: "Rental" },
        ],
      },
      { key: "typeOfFarmer", label: "Type of Farmer", type: "text" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "pwd",
    label: "PWD",
    details: [
      { key: "typeOfDisability", label: "Type of Disability", type: "text" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "4ps",
    label: "4Ps",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    key: "tricycle_driver",
    label: "Tricycle Driver",
    details: [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "Rental", label: "Rental" },
          { value: "Owner", label: "Owner" },
        ],
      },
      { key: "plateNumber", label: "Plate Number", type: "text" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "fisherfolk",
    label: "Fisherfolk",
    details: [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "Boat Owner", label: "Boat Owner" },
          { value: "Passenger", label: "Passenger" },
          { value: "Rental", label: "Rental" },
        ],
      },
      { key: "typeOfFisherfolk", label: "Type of Fisherfolk", type: "text" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "senior_citizen",
    label: "Senior Citizen",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    key: "voter",
    label: "Voter",
    details: [
      {
        key: "typeOfVoter",
        label: "Type of Voter",
        type: "select",
        options: [
          { value: "Regular", label: "Regular" },
          { value: "SK", label: "SK" },
        ],
      },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "business_owner",
    label: "Business Owner",
    details: [
      { key: "typeOfBusiness", label: "Type of Business", type: "text" },
      { key: "businessPermit", label: "Business Permit", type: "text" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
];
export const residentSteps = [
  { key: "info", label: "Resident Info" },
  { key: "classifications", label: "Classifications" },
  { key: "picture", label: "Picture" },
];
