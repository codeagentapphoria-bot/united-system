import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Inventory from "../services/inventoriesServices.js";

export const upsertInventory = async (req, res, next) => {
  let {
    barangayId,
    itemName,
    itemType,
    description,
    sponsors,
    quantity,
    unit
  } = req.body;
  const { inventoryId } = req.params;
  // Support file upload
  let filePath = req.files?.filePath?.[0]?.path || req.body.filePath;

  try {
    let result;
    if (!inventoryId) {
      result = await Inventory.insertInventory({
        barangayId,
        itemName,
        itemType,
        description,
        sponsors,
        quantity,
        unit,
        filePath
      });
    } else {
      result = await Inventory.updateInventory({
        inventoryId,
        barangayId,
        itemName,
        itemType,
        description,
        sponsors,
        quantity,
        unit,
        filePath
      });
    }
    return res.status(200).json({
      message: "Successfully upserted inventory",
      data: result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in upsertInventory: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const deleteInventory = async (req, res, next) => {
  const { inventoryId } = req.params;
  try {
    const result = await Inventory.deleteInventory(inventoryId);
    return res.status(200).json({
      message: "Successfully deleted inventory",
      data: result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in deleteInventory: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const inventoryList = async (req, res, next) => {
  try {
    const {
      barangayId,
      itemType,
      search = '',
      page = 1,
      perPage = 10
    } = req.query;
    const result = await Inventory.inventoryList({
      barangayId,
      itemType,
      search,
      page: Number(page),
      perPage: Number(perPage)
    });
    return res.status(200).json({
      message: "Successfully fetched inventories list",
      ...result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in inventoryList: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const inventoryInfo = async (req, res, next) => {
  const { inventoryId } = req.params;
  try {
    const result = await Inventory.inventoryInfo(inventoryId);
    return res.status(200).json({
      message: "Successfully fetched inventory info",
      data: result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in inventoryInfo: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
}; 