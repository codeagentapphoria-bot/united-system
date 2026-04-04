/**
 * address.routes.ts
 *
 * Provides address hierarchy data from barangays + municipalities tables.
 * Used by the portal registration wizard for cascading address dropdowns.
 *
 * Replaces the old "addresses" reference lookup table routes.
 */

import { Request, Response, Router } from 'express';
import {
  getBarangay,
  getBarangayGeojson,
  getBarangaysByMunicipality,
  getMunicipalities,
} from '../services/address.service';

const router = Router();

// =============================================================================
// General Settings: Address CRUD stub
// The old standalone "addresses" table was removed in v2 — address data now
// comes from gis_municipality + barangays tables.
// These stubs prevent 404s on the General Settings > Address admin page.
// =============================================================================

router.get('/', async (_req: Request, res: Response) => {
  res.status(200).json({ status: 'success', data: [] });
});

router.post('/', async (_req: Request, res: Response) => {
  res.status(501).json({ status: 'error', message: 'Address management is handled via GIS data. Use the municipality setup flow.' });
});

router.put('/:id', async (_req: Request, res: Response) => {
  res.status(501).json({ status: 'error', message: 'Address management is handled via GIS data.' });
});

router.delete('/:id', async (_req: Request, res: Response) => {
  res.status(501).json({ status: 'error', message: 'Address management is handled via GIS data.' });
});

router.patch('/:id/activate', async (_req: Request, res: Response) => {
  res.status(501).json({ status: 'error', message: 'Address management is handled via GIS data.' });
});

router.patch('/:id/deactivate', async (_req: Request, res: Response) => {
  res.status(501).json({ status: 'error', message: 'Address management is handled via GIS data.' });
});

// =============================================================================
// Public address hierarchy endpoints (no auth required)
// =============================================================================

// GET /api/addresses/municipalities
// Returns all active municipalities (for portal dropdowns)
router.get('/municipalities', async (_req: Request, res: Response) => {
  try {
    const municipalities = await getMunicipalities();
    res.status(200).json({ status: 'success', data: municipalities });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /api/addresses/barangays?municipalityId=1
// Returns all barangays for a given municipality
router.get('/barangays', async (req: Request, res: Response) => {
  try {
    const { municipalityId } = req.query;
    if (!municipalityId) {
      res.status(400).json({ status: 'error', message: 'municipalityId is required' });
      return;
    }
    const barangays = await getBarangaysByMunicipality(Number(municipalityId));
    res.status(200).json({ status: 'success', data: barangays });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /api/addresses/barangays/:id
// Returns a single barangay with full address context
router.get('/barangays/:id', async (req: Request, res: Response) => {
  try {
    const barangay = await getBarangay(Number(req.params.id));
    res.status(200).json({ status: 'success', data: barangay });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
});

// GET /api/addresses/barangays/:id/geojson
// Returns the barangay boundary as GeoJSON (for household map picker overlay).
// Returns 404 if the barangay has no GIS code assigned yet.
router.get('/barangays/:id/geojson', async (req: Request, res: Response) => {
  try {
    const geojson = await getBarangayGeojson(Number(req.params.id));
    res.status(200).json({ status: 'success', data: geojson });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
});

export default router;
