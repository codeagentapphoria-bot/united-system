import {
  getRoleFromToken,
  getPermissionLevelFromToken,
} from "@/constants/token";
import { ROLES } from "@/constants/roles";

const useRoles = () => {
  const role = getRoleFromToken();
  const permissionLevel = getPermissionLevelFromToken();

  return {
    role,
    permissionLevel,
    isAdmin: role === ROLES.ADMIN,
    isMunicipality: role === ROLES.MUNICIPALITY,
    isBarangay: role === ROLES.BARANGAY,
    isUser: role === ROLES.USER,
    isPermissionAdmin: permissionLevel === "admin",
    isPermissionStaff: permissionLevel === "staff",
  };
};

export default useRoles;
