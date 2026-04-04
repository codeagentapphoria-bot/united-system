import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  activateGovernmentProgram,
  createGovernmentProgram,
  deactivateGovernmentProgram,
  deleteGovernmentProgram,
  getGovernmentProgram,
  getGovernmentPrograms,
  updateGovernmentProgram,
} from '../services/government-program.service';
import {
  emitGovernmentProgramDelete,
  emitGovernmentProgramNew,
  emitGovernmentProgramUpdate,
} from '../services/socket.service';

export const createGovernmentProgramController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const governmentProgram = await createGovernmentProgram(req.body);

    // Emit WebSocket event for new government program
    emitGovernmentProgramNew({
      id: governmentProgram.id,
      name: governmentProgram.name,
      description: governmentProgram.description || undefined,
      type: governmentProgram.type,
      isActive: governmentProgram.isActive,
      createdAt: governmentProgram.createdAt,
    });

    res.status(201).json({
      status: 'success',
      data: governmentProgram,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create government program',
    });
  }
};

export const getGovernmentProgramsController = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const search = _req.query.search as string;
    const type = _req.query.type as
      | 'SENIOR_CITIZEN'
      | 'PWD'
      | 'STUDENT'
      | 'SOLO_PARENT'
      | 'ALL'
      | undefined;
    const isActive =
      _req.query.isActive === 'true' ? true : _req.query.isActive === 'false' ? false : undefined;

    const governmentPrograms = await getGovernmentPrograms({
      search,
      type,
      isActive,
    });

    res.status(200).json({
      status: 'success',
      data: governmentPrograms,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch government programs',
    });
  }
};

export const getGovernmentProgramController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const governmentProgram = await getGovernmentProgram(id);
    res.status(200).json({
      status: 'success',
      data: governmentProgram,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Government program not found',
    });
  }
};

export const updateGovernmentProgramController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Get old program to capture old isActive status
    const oldProgram = await getGovernmentProgram(id);
    const oldIsActive = oldProgram?.isActive;

    const governmentProgram = await updateGovernmentProgram(id, req.body);

    // Emit WebSocket event for program update
    emitGovernmentProgramUpdate(id, {
      name: governmentProgram.name,
      description: governmentProgram.description || undefined,
      type: governmentProgram.type,
      isActive: governmentProgram.isActive,
      oldIsActive,
      updatedAt: governmentProgram.updatedAt,
    });

    res.status(200).json({
      status: 'success',
      data: governmentProgram,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update government program',
    });
  }
};

export const deleteGovernmentProgramController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteGovernmentProgram(id);

    // Emit WebSocket event for program deletion
    emitGovernmentProgramDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Government program deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to delete government program',
    });
  }
};

export const activateGovernmentProgramController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Get old program to capture old isActive status
    const oldProgram = await getGovernmentProgram(id);
    const oldIsActive = oldProgram?.isActive;

    const governmentProgram = await activateGovernmentProgram(id);

    // Emit WebSocket event for program activation
    emitGovernmentProgramUpdate(id, {
      name: governmentProgram.name,
      description: governmentProgram.description || undefined,
      type: governmentProgram.type,
      isActive: true,
      oldIsActive,
      updatedAt: governmentProgram.updatedAt,
    });

    res.status(200).json({
      status: 'success',
      data: governmentProgram,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to activate government program',
    });
  }
};

export const deactivateGovernmentProgramController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Get old program to capture old isActive status
    const oldProgram = await getGovernmentProgram(id);
    const oldIsActive = oldProgram?.isActive;

    const governmentProgram = await deactivateGovernmentProgram(id);

    // Emit WebSocket event for program deactivation
    emitGovernmentProgramUpdate(id, {
      name: governmentProgram.name,
      description: governmentProgram.description || undefined,
      type: governmentProgram.type,
      isActive: false,
      oldIsActive,
      updatedAt: governmentProgram.updatedAt,
    });

    res.status(200).json({
      status: 'success',
      data: governmentProgram,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to deactivate government program',
    });
  }
};
