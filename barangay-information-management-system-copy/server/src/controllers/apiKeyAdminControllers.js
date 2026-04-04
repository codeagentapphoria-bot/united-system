import ApiKeyModel from "../models/ApiKey.js";
import { ApiError } from "../utils/apiError.js";

export const createApiKey = async (req, res, next) => {
  try {
    const { name, scopes, rateLimitPerMinute, expiresAt } = req.body || {};
    if (!name) throw new ApiError(400, "Name is required");

    const municipalityId = req.user?.target_id;
    const targetType = req.user?.target_type;
    if (targetType !== "municipality") throw new ApiError(403, "Only municipality users can create API keys");

    const created = await ApiKeyModel.createKey({
      name,
      municipalityId: Number(municipalityId),
      scopes: Array.isArray(scopes) && scopes.length ? scopes : ["read"],
      rateLimitPerMinute: Number(rateLimitPerMinute) || 60,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdByUserId: Number(req.user.id),
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const listApiKeys = async (req, res, next) => {
  try {
    const municipalityId = req.user?.target_id;
    const targetType = req.user?.target_type;
    if (targetType !== "municipality") throw new ApiError(403, "Only municipality users can list API keys");
    const keys = await ApiKeyModel.listKeys({ municipalityId: Number(municipalityId) });
    res.json({ success: true, data: keys });
  } catch (err) {
    next(err);
  }
};

export const revokeApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw new ApiError(400, "Key id is required");
    const municipalityId = req.user?.target_id;
    const targetType = req.user?.target_type;
    if (targetType !== "municipality") throw new ApiError(403, "Only municipality users can revoke API keys");
    const ok = await ApiKeyModel.revokeKey({ id: Number(id), municipalityId: Number(municipalityId) });
    if (!ok) throw new ApiError(404, "API key not found");
    res.json({ success: true, message: "API key revoked" });
  } catch (err) {
    next(err);
  }
};

// Reveal full API key (admin only)
export const revealApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw new ApiError(400, "Key id is required");
    const municipalityId = Number(req.user?.target_id);
    const targetType = req.user?.target_type;
    const role = req.user?.role;
    if (targetType !== "municipality" || role !== "admin") {
      throw new ApiError(403, "Only municipality admins can reveal API keys");
    }

    const record = await ApiKeyModel.getKeyById({ id: Number(id), municipalityId });
    if (!record) throw new ApiError(404, "API key not found");
    if (record.revoked) throw new ApiError(400, "API key is revoked");

    res.json({ success: true, data: { key: record.key, name: record.name, id: record.id } });
  } catch (err) {
    next(err);
  }
};

export const deleteApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw new ApiError(400, "Key id is required");
    const municipalityId = Number(req.user?.target_id);
    const targetType = req.user?.target_type;
    const role = req.user?.role;
    if (targetType !== "municipality" || role !== "admin") {
      throw new ApiError(403, "Only municipality admins can delete API keys");
    }

    const ok = await ApiKeyModel.deleteKey({ id: Number(id), municipalityId });
    if (!ok) throw new ApiError(404, "API key not found");
    res.json({ success: true, message: "API key permanently deleted" });
  } catch (err) {
    next(err);
  }
};


