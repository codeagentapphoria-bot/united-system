# Barangay Certificate BIMS Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move barangay certificate online intake into eService while preserving BIMS as the template source, processing queue, PDF generator, and status owner.

**Architecture:** eService adds a resident-authenticated template catalog endpoint over the shared `certificate_templates` table and submits portal transactions with `service_data.certificate_type`. BIMS continues to process the shared transaction rows, reading the portal certificate type from transaction JSON instead of eService service metadata. eService blocks guest/crafted certificate submissions and generic admin certificate mutations server-side.

**Tech Stack:** Express, TypeScript, Prisma, React, Vite, Jest, BIMS Express raw SQL, React Query, React Router.

---

## File Map

| File | Purpose |
|---|---|
| `multysis-backend/src/services/certificate-template.service.ts` | New eService backend read service for active BIMS certificate templates scoped to the authenticated resident. |
| `multysis-backend/src/controllers/certificate-template.controller.ts` | New controller for resident certificate catalog endpoint. |
| `multysis-backend/src/routes/certificate-template.routes.ts` | New resident-authenticated route mounted under `/api/portal/certificates`. |
| `multysis-backend/src/services/__tests__/certificate-template.service.test.ts` | Unit tests for resident municipality scoping and field projection. |
| `multysis-backend/src/services/transaction.service.ts` | Add Barangay Certificate create guard and admin mutation guard. |
| `multysis-backend/src/controllers/transaction.controller.ts` | Pass authenticated actor into transaction creation/update service calls. |
| `multysis-backend/src/services/__tests__/transaction-barangay-certificate.test.ts` | Unit tests for guest rejection, resident mismatch rejection, template validation, and admin update blocking. |
| `multysis-backend/src/index.ts` | Mount new certificate template route. |
| `barangay-information-management-system-copy/server/src/routes/certificateRoutes.js` | BIMS queue reads portal `certificate_type` from `transactions.service_data`. |
| `multysis-frontend/src/services/api/certificate-template.service.ts` | Frontend API client for resident template catalog. |
| `multysis-frontend/src/components/portal/RequestBarangayCertificateModal.tsx` | New small request modal for BIMS-template-backed barangay certificates. |
| `multysis-frontend/src/components/portal/CategoryServicesModal.tsx` | Special-case Barangay Certificate category to render templates, not service rows. |
| `multysis-frontend/src/pages/admin/ServicePage.tsx` | Show BIMS-routing notice for Barangay Certificate admin pages instead of generic processing tabs. |
| `multysis-frontend/src/components/portal/MyApplications.tsx` | Add BIMS certificate statuses to resident filter/display handling. |
| `multysis-frontend/e2e/dynamic-eservice.spec.ts` | Update smoke coverage to assert template-backed certificate intake and BIMS-routing behavior. |

## Task 1: Resident Certificate Template Endpoint

**Files:**
- Create: `multysis-backend/src/services/certificate-template.service.ts`
- Create: `multysis-backend/src/controllers/certificate-template.controller.ts`
- Create: `multysis-backend/src/routes/certificate-template.routes.ts`
- Create: `multysis-backend/src/services/__tests__/certificate-template.service.test.ts`
- Modify: `multysis-backend/src/index.ts`

- [ ] **Step 1: Write service tests for resident-scoped template listing**

Create `multysis-backend/src/services/__tests__/certificate-template.service.test.ts`:

```ts
import prisma from '../../config/database';
import { getActiveCertificateTemplatesForResident } from '../certificate-template.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    resident: { findUnique: jest.fn() },
    certificateTemplate: { findMany: jest.fn() },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('certificate-template.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns only public fields for active templates in the resident municipality', async () => {
    (mockedPrisma.resident.findUnique as jest.Mock).mockResolvedValue({
      id: 'resident-1',
      barangay: { municipalityId: 7 },
    });
    (mockedPrisma.certificateTemplate.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'template-1',
        name: 'Barangay Clearance',
        description: 'Clearance template',
        certificateType: 'barangay_clearance',
      },
    ]);

    await expect(getActiveCertificateTemplatesForResident('resident-1')).resolves.toEqual([
      {
        id: 'template-1',
        name: 'Barangay Clearance',
        description: 'Clearance template',
        certificateType: 'barangay_clearance',
      },
    ]);

    expect(mockedPrisma.certificateTemplate.findMany).toHaveBeenCalledWith({
      where: { municipalityId: 7, isActive: true },
      select: { id: true, name: true, description: true, certificateType: true },
      orderBy: { name: 'asc' },
    });
  });

  it('rejects residents without a barangay', async () => {
    (mockedPrisma.resident.findUnique as jest.Mock).mockResolvedValue({
      id: 'resident-1',
      barangay: null,
    });

    await expect(getActiveCertificateTemplatesForResident('resident-1')).rejects.toThrow(
      'Resident must have a barangay before requesting certificates'
    );
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run from `multysis-backend`:

```bash
npx jest src/services/__tests__/certificate-template.service.test.ts --runInBand
```

Expected: FAIL because `../certificate-template.service` does not exist.

- [ ] **Step 3: Implement the service**

Create `multysis-backend/src/services/certificate-template.service.ts`:

```ts
import prisma from '../config/database';
import { CustomError } from '../middleware/error';

export interface ResidentCertificateTemplate {
  id: string;
  name: string;
  description: string | null;
  certificateType: string;
}

export const getActiveCertificateTemplatesForResident = async (
  residentId: string
): Promise<ResidentCertificateTemplate[]> => {
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { id: true, barangay: { select: { municipalityId: true } } },
  });

  if (!resident) {
    throw new CustomError('Resident not found', 404);
  }

  const municipalityId = resident.barangay?.municipalityId;
  if (!municipalityId) {
    throw new CustomError('Resident must have a barangay before requesting certificates', 400);
  }

  return prisma.certificateTemplate.findMany({
    where: { municipalityId, isActive: true },
    select: { id: true, name: true, description: true, certificateType: true },
    orderBy: { name: 'asc' },
  });
};
```

- [ ] **Step 4: Implement controller and route**

Create `multysis-backend/src/controllers/certificate-template.controller.ts`:

```ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getActiveCertificateTemplatesForResident } from '../services/certificate-template.service';

export const getResidentCertificateTemplatesController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'resident') {
      res.status(403).json({ status: 'error', message: 'Resident access required' });
      return;
    }

    const templates = await getActiveCertificateTemplatesForResident(req.user.id);
    res.status(200).json({ status: 'success', data: templates });
  } catch (error: any) {
    res.status(error.statusCode || error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to fetch certificate templates',
    });
  }
};
```

Create `multysis-backend/src/routes/certificate-template.routes.ts`:

```ts
import { Router } from 'express';
import { getResidentCertificateTemplatesController } from '../controllers/certificate-template.controller';
import { verifyResident } from '../middleware/auth';

const router = Router();

router.get('/templates', verifyResident, getResidentCertificateTemplatesController);

export default router;
```

Modify `multysis-backend/src/index.ts`:

```ts
import certificateTemplateRoutes from './routes/certificate-template.routes';

app.use('/api/portal/certificates', apiLimiter, certificateTemplateRoutes);
```

Place the `app.use` next to the other `/api/portal/*` route registrations.

- [ ] **Step 5: Run the focused backend test**

Run from `multysis-backend`:

```bash
npx jest src/services/__tests__/certificate-template.service.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add multysis-backend/src/services/certificate-template.service.ts multysis-backend/src/controllers/certificate-template.controller.ts multysis-backend/src/routes/certificate-template.routes.ts multysis-backend/src/services/__tests__/certificate-template.service.test.ts multysis-backend/src/index.ts
git commit -m "feat(eservice): expose resident certificate templates"
```

## Task 2: Barangay Certificate Transaction Guards

**Files:**
- Modify: `multysis-backend/src/services/transaction.service.ts`
- Modify: `multysis-backend/src/controllers/transaction.controller.ts`
- Create: `multysis-backend/src/services/__tests__/transaction-barangay-certificate.test.ts`

- [ ] **Step 1: Write tests for create and admin mutation guards**

Create `multysis-backend/src/services/__tests__/transaction-barangay-certificate.test.ts`:

```ts
import prisma from '../../config/database';
import { createTransaction, updateTransaction } from '../transaction.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    resident: { findUnique: jest.fn() },
    service: { findUnique: jest.fn() },
    certificateTemplate: { findFirst: jest.fn() },
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../tax-computation.service', () => ({
  __esModule: true,
  computeTaxForTransaction: jest.fn(),
}));

jest.mock('../dev.service', () => ({
  __esModule: true,
  addDevLog: jest.fn(),
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

const barangayService = {
  id: 'service-1',
  code: 'BRGY_CERTIFICATE',
  category: 'Barangay Certificate',
  isActive: true,
  defaultAmount: 0,
  paymentStatuses: ['PENDING'],
  requiresAppointment: false,
};

describe('barangay certificate transaction guards', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects unauthenticated barangay certificate submissions', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue(barangayService);

    await expect(
      createTransaction({
        applicantName: 'Guest User',
        serviceId: 'service-1',
        serviceData: { certificate_type: 'barangay_clearance', purpose: 'Employment' },
      })
    ).rejects.toThrow('Barangay certificates require an authenticated resident');
  });

  it('rejects resident mismatch for barangay certificates', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue(barangayService);
    (mockedPrisma.resident.findUnique as jest.Mock).mockResolvedValue({
      id: 'resident-1',
      barangayId: 10,
      barangay: { municipalityId: 7 },
    });

    await expect(
      createTransaction(
        {
          residentId: 'resident-1',
          serviceId: 'service-1',
          serviceData: { certificate_type: 'barangay_clearance', purpose: 'Employment' },
        },
        { id: 'resident-2', type: 'resident' }
      )
    ).rejects.toThrow('Residents can only request barangay certificates for themselves');
  });

  it('rejects inactive or missing resident municipality templates', async () => {
    (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue(barangayService);
    (mockedPrisma.resident.findUnique as jest.Mock).mockResolvedValue({
      id: 'resident-1',
      barangayId: 10,
      barangay: { municipalityId: 7 },
    });
    (mockedPrisma.certificateTemplate.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      createTransaction(
        {
          residentId: 'resident-1',
          serviceId: 'service-1',
          serviceData: { certificate_type: 'barangay_clearance', purpose: 'Employment' },
        },
        { id: 'resident-1', type: 'resident' }
      )
    ).rejects.toThrow('Selected certificate template is not available');
  });

  it('rejects generic eService admin updates for barangay certificate transactions', async () => {
    (mockedPrisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      service: barangayService,
      resident: null,
    });

    await expect(updateTransaction('tx-1', { status: 'APPROVED' }, { type: 'admin' })).rejects.toThrow(
      'Barangay certificate transactions are processed in BIMS'
    );
  });
});
```

- [ ] **Step 2: Run the guard tests and verify they fail**

Run from `multysis-backend`:

```bash
npx jest src/services/__tests__/transaction-barangay-certificate.test.ts --runInBand
```

Expected: FAIL because `createTransaction` and `updateTransaction` do not accept the actor parameter and do not guard Barangay Certificate rows.

- [ ] **Step 3: Add actor types and helper guards**

Modify `multysis-backend/src/services/transaction.service.ts` near the interfaces:

```ts
export type TransactionActor =
  | { id: string; type: 'resident' | 'admin' | 'dev' }
  | undefined;

const BARANGAY_CERTIFICATE_CATEGORY = 'Barangay Certificate';

const isBarangayCertificateService = (service: { category?: string | null }) =>
  service.category === BARANGAY_CERTIFICATE_CATEGORY;

const getStringServiceData = (
  serviceData: Record<string, unknown> | undefined,
  key: string
): string | undefined => {
  const value = serviceData?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const assertBarangayCertificateCreateAllowed = async (
  data: CreateTransactionData,
  actor: TransactionActor,
  resident: { id: string; barangayId: number | null; barangay?: { municipalityId: number } | null } | null
) => {
  if (!actor || actor.type !== 'resident') {
    throw new CustomError('Barangay certificates require an authenticated resident', 403);
  }

  if (!data.residentId || data.residentId !== actor.id) {
    throw new CustomError('Residents can only request barangay certificates for themselves', 403);
  }

  if (!resident?.barangayId || !resident.barangay?.municipalityId) {
    throw new CustomError('Resident must have a barangay before requesting certificates', 400);
  }

  const certificateType = getStringServiceData(data.serviceData, 'certificate_type');
  const purpose = getStringServiceData(data.serviceData, 'purpose');

  if (!certificateType) {
    throw new CustomError('Certificate type is required', 400);
  }
  if (!purpose) {
    throw new CustomError('Purpose is required', 400);
  }

  const template = await prisma.certificateTemplate.findFirst({
    where: {
      municipalityId: resident.barangay.municipalityId,
      certificateType,
      isActive: true,
    },
    select: { id: true },
  });

  if (!template) {
    throw new CustomError('Selected certificate template is not available', 400);
  }
};

const assertNotBarangayCertificateAdminMutation = (
  service: { category?: string | null },
  actor: TransactionActor
) => {
  if (actor?.type === 'admin' && isBarangayCertificateService(service)) {
    throw new CustomError('Barangay certificate transactions are processed in BIMS', 403);
  }
};
```

- [ ] **Step 4: Update transaction create/update signatures and calls**

Modify `createTransaction` signature and resident include in `multysis-backend/src/services/transaction.service.ts`:

```ts
export const createTransaction = async (data: CreateTransactionData, actor?: TransactionActor) => {
  // existing validation remains
```

Change the resident lookup to include barangay municipality:

```ts
data.residentId
  ? prisma.resident.findUnique({
      where: { id: data.residentId },
      include: { barangay: { select: { municipalityId: true } } },
    })
  : Promise.resolve(null)
```

After `service.isActive` validation, add:

```ts
if (isBarangayCertificateService(service)) {
  await assertBarangayCertificateCreateAllowed(data, actor, resident);
}
```

Modify `updateTransaction` signature:

```ts
export const updateTransaction = async (
  id: string,
  data: {
    paymentStatus?: string;
    paymentAmount?: number;
    status?: string;
    isPosted?: boolean;
    remarks?: string;
    serviceData?: Record<string, unknown>;
    appointmentStatus?: string;
    scheduledAppointmentDate?: Date;
    updateRequestStatus?: string;
    adminUpdateRequestDescription?: string;
  },
  actor?: TransactionActor
) => {
```

After the `oldTransaction` not-found check, add:

```ts
assertNotBarangayCertificateAdminMutation(oldTransaction.service, actor);
```

Modify `multysis-backend/src/controllers/transaction.controller.ts`:

```ts
const transaction = await createTransaction(req.body, req.user);
```

and:

```ts
const transaction = await updateTransaction(req.params.id, req.body, req.user);
```

- [ ] **Step 5: Guard admin request-update/review service functions**

In `multysis-backend/src/services/transaction.service.ts`, find `adminRequestTransactionUpdate` and `reviewTransactionUpdateRequest`. After each loads its transaction with `service`, add:

```ts
assertNotBarangayCertificateAdminMutation(transaction.service, { type: 'admin', id: data.adminId });
```

If the function uses a different admin id property, pass the existing admin id from that function's input. The guard only needs `{ type: 'admin', id: string }`.

- [ ] **Step 6: Run guard tests**

Run from `multysis-backend`:

```bash
npx jest src/services/__tests__/transaction-barangay-certificate.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 7: Run existing service access tests**

Run from `multysis-backend`:

```bash
npx jest src/services/__tests__/service-access.service.test.ts src/routes/__tests__/service.routes.access.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add multysis-backend/src/services/transaction.service.ts multysis-backend/src/controllers/transaction.controller.ts multysis-backend/src/services/__tests__/transaction-barangay-certificate.test.ts
git commit -m "fix(eservice): guard certificate transactions"
```

## Task 3: BIMS Queue Reads Portal Certificate Type From Transaction JSON

**Files:**
- Modify: `barangay-information-management-system-copy/server/src/routes/certificateRoutes.js:343-460`

- [ ] **Step 1: Patch the portal subquery certificate type resolution**

In `barangay-information-management-system-copy/server/src/routes/certificateRoutes.js`, change the portal subquery certificate type expression from:

```sql
COALESCE(
  s.form_fields->>'certificate_type',
  s.code
) AS certificate_type,
```

to:

```sql
COALESCE(
  t.service_data->>'certificate_type',
  s.form_fields->>'certificate_type',
  s.code
) AS certificate_type,
```

- [ ] **Step 2: Patch the API comment above the queue**

In the normalized response shape comment, change:

```js
*   certificate_type — requests.certificate_type | services.form_fields->>'certificate_type'
```

to:

```js
*   certificate_type — requests.certificate_type | transactions.service_data.certificate_type | legacy services.form_fields.certificate_type
```

- [ ] **Step 3: Run BIMS backend syntax check**

Run from `barangay-information-management-system-copy/server`:

```bash
npm run build
```

Expected: `Build successful - all files validated`.

- [ ] **Step 4: Commit**

```bash
git add barangay-information-management-system-copy/server/src/routes/certificateRoutes.js
git commit -m "fix(bims): read portal certificate type from transaction data"
```

## Task 4: Template-Backed Portal Certificate UI

**Files:**
- Create: `multysis-frontend/src/services/api/certificate-template.service.ts`
- Create: `multysis-frontend/src/components/portal/RequestBarangayCertificateModal.tsx`
- Modify: `multysis-frontend/src/components/portal/CategoryServicesModal.tsx`

- [ ] **Step 1: Add the frontend template API client**

Create `multysis-frontend/src/services/api/certificate-template.service.ts`:

```ts
import api from './auth.service';

export interface ResidentCertificateTemplate {
  id: string;
  name: string;
  description: string | null;
  certificateType: string;
}

export const certificateTemplateService = {
  async getResidentTemplates(signal?: AbortSignal): Promise<ResidentCertificateTemplate[]> {
    const response = await api.get('/portal/certificates/templates', { signal });
    return response.data.data || [];
  },
};
```

- [ ] **Step 2: Add the focused request modal**

Create `multysis-frontend/src/components/portal/RequestBarangayCertificateModal.tsx`:

```tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { transactionService } from '@/services/api/transaction.service';
import type { Service } from '@/services/api/service.service';
import type { ResidentCertificateTemplate } from '@/services/api/certificate-template.service';

interface Props {
  open: boolean;
  onClose: () => void;
  service: Service;
  template: ResidentCertificateTemplate;
}

export const RequestBarangayCertificateModal: React.FC<Props> = ({ open, onClose, service, template }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const submit = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Login required', description: 'Please log in as a resident.' });
      return;
    }
    if (!purpose.trim()) {
      toast({ variant: 'destructive', title: 'Purpose required', description: 'State the purpose of this certificate.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const transaction = await transactionService.createTransaction({
        residentId: user.id,
        serviceId: service.id,
        serviceData: {
          certificate_type: template.certificateType,
          purpose: purpose.trim(),
        },
        paymentAmount: service.defaultAmount ? Number(service.defaultAmount) : undefined,
        isLocalResident: true,
      });
      setReferenceNumber(transaction.referenceNumber);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: error.response?.data?.message || error.message || 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{referenceNumber ? 'Request submitted' : template.name}</DialogTitle>
          <DialogDescription>
            {referenceNumber
              ? 'Your barangay will process this request in BIMS.'
              : 'This certificate is issued by your barangay and processed in BIMS.'}
          </DialogDescription>
        </DialogHeader>

        {referenceNumber ? (
          <div className="rounded-lg border bg-green-50 p-4 text-center">
            <p className="text-sm text-gray-600">Reference number</p>
            <p className="text-xl font-mono font-bold text-green-700">{referenceNumber}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="certificate-purpose">
              Purpose <span className="text-red-500">*</span>
            </label>
            <textarea
              id="certificate-purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className="min-h-[110px] w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="Example: employment, scholarship, government assistance"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {referenceNumber ? 'Close' : 'Cancel'}
          </Button>
          {!referenceNumber && (
            <Button onClick={submit} disabled={isSubmitting || !purpose.trim()}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 3: Special-case Barangay Certificate in `CategoryServicesModal`**

Modify imports in `multysis-frontend/src/components/portal/CategoryServicesModal.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import {
  certificateTemplateService,
  type ResidentCertificateTemplate,
} from '@/services/api/certificate-template.service';
import { RequestBarangayCertificateModal } from './RequestBarangayCertificateModal';
```

Add state after existing modal state:

```tsx
const [certificateTemplates, setCertificateTemplates] = useState<ResidentCertificateTemplate[]>([]);
const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
const [selectedTemplate, setSelectedTemplate] = useState<ResidentCertificateTemplate | null>(null);
const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
const isBarangayCertificateCategory = category === 'Barangay Certificate';
const transportService = services[0];
```

Add an effect after `filteredServices`:

```tsx
useEffect(() => {
  if (!open || !isBarangayCertificateCategory || !user) return;

  const controller = new AbortController();
  setIsLoadingTemplates(true);
  certificateTemplateService
    .getResidentTemplates(controller.signal)
    .then(setCertificateTemplates)
    .catch(() => setCertificateTemplates([]))
    .finally(() => setIsLoadingTemplates(false));

  return () => controller.abort();
}, [open, isBarangayCertificateCategory, user]);
```

Add a helper before `return`:

```tsx
const openCertificateTemplate = (template: ResidentCertificateTemplate) => {
  if (!user) {
    openLoginSheet();
    return;
  }
  if (!transportService) return;
  setSelectedTemplate(template);
  setIsCertificateModalOpen(true);
};
```

Inside the scrollable list area, branch before rendering `filteredServices`:

```tsx
{isBarangayCertificateCategory ? (
  isLoadingTemplates ? (
    <div className="text-center py-8 text-gray-500">Loading certificate templates...</div>
  ) : !user ? (
    <div className="text-center py-8 text-gray-500">Log in as a resident to view certificate templates for your municipality.</div>
  ) : certificateTemplates.length === 0 ? (
    <div className="text-center py-8 text-gray-500">No active certificate templates are available for your municipality.</div>
  ) : (
    certificateTemplates.map((template) => (
      <div key={template.id} className="border rounded-lg p-4 transition-all hover:border-primary-300 hover:bg-gray-50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-semibold text-heading-700">{template.name}</h4>
            <p className="text-sm text-heading-600 mt-1">{template.description || 'Barangay certificate template'}</p>
          </div>
          <Button size="sm" onClick={() => openCertificateTemplate(template)} disabled={!transportService}>
            Request <FiArrowRight className="ml-1" size={14} />
          </Button>
        </div>
      </div>
    ))
  )
) : (
  /* keep existing filteredServices rendering here */
)}
```

Render the new modal after existing `RequestServiceModal` block:

```tsx
{selectedTemplate && transportService && (
  <RequestBarangayCertificateModal
    open={isCertificateModalOpen}
    onClose={() => {
      setIsCertificateModalOpen(false);
      setSelectedTemplate(null);
    }}
    service={transportService}
    template={selectedTemplate}
  />
)}
```

- [ ] **Step 4: Run frontend build**

Run from `multysis-frontend`:

```bash
npm run build
```

Expected: build succeeds. Existing non-blocking `src/utils/logger.ts` dynamic/static import warning may remain.

- [ ] **Step 5: Commit**

```bash
git add multysis-frontend/src/services/api/certificate-template.service.ts multysis-frontend/src/components/portal/RequestBarangayCertificateModal.tsx multysis-frontend/src/components/portal/CategoryServicesModal.tsx
git commit -m "feat(eservice): request certificates from BIMS templates"
```

## Task 5: Block eService Admin Processing UI for Certificates

**Files:**
- Modify: `multysis-frontend/src/pages/admin/ServicePage.tsx`

- [ ] **Step 1: Replace generic tabs for Barangay Certificate services**

In `ServicePage.tsx`, before the main `return`, add:

```tsx
const isBarangayCertificate = service.category === 'Barangay Certificate';
```

Inside `<AccessControlGate>`, before the current tabs card, add this branch:

```tsx
{isBarangayCertificate ? (
  <Card>
    <CardContent className="p-8 text-center space-y-3">
      <h3 className="text-lg font-semibold text-heading-700">Processed in BIMS</h3>
      <p className="text-sm text-gray-600 max-w-xl mx-auto">
        Barangay certificate requests are submitted through eService but processed by barangay staff in BIMS.
        Use the BIMS certificate queue to review, print, release, or update these requests.
      </p>
    </CardContent>
  </Card>
) : (
  <Card>
    {/* existing tabs card */}
  </Card>
)}
```

Keep the existing page header visible above the notice.

- [ ] **Step 2: Run frontend build**

Run from `multysis-frontend`:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add multysis-frontend/src/pages/admin/ServicePage.tsx
git commit -m "fix(eservice): route certificate admins to BIMS"
```

## Task 6: Resident Status Mapping for BIMS Certificate States

**Files:**
- Modify: `multysis-frontend/src/components/portal/MyApplications.tsx`

- [ ] **Step 1: Add BIMS portal statuses to filters**

Replace the `statusOptions` array with:

```tsx
const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'FOR_RELEASE', label: 'For Release' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
```

If the component has a status label helper, normalize underscores there:

```tsx
const formatStatusLabel = (status?: string) =>
  status
    ? status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Pending';
```

- [ ] **Step 2: Run frontend build**

Run from `multysis-frontend`:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add multysis-frontend/src/components/portal/MyApplications.tsx
git commit -m "fix(eservice): show BIMS certificate statuses"
```

## Task 7: E2E Smoke Coverage Update

**Files:**
- Modify: `multysis-frontend/e2e/dynamic-eservice.spec.ts`

- [ ] **Step 1: Update the certificate portal expectation**

Replace assertions that expect hardcoded `Barangay Clearance` service cards with template-backed assertions:

```ts
await page.getByText('Barangay Certificate Services').click();
await expect(page.getByText(/certificate templates|Barangay Clearance|Certificate of/i).first()).toBeVisible();
```

If the e2e uses API setup, add an API assertion that the resident catalog is projected:

```ts
const templates = await page.request.get('/api/portal/certificates/templates');
expect(templates.status()).toBe(200);
const body = await templates.json();
expect(body.data[0]).not.toHaveProperty('htmlContent');
```

- [ ] **Step 2: Add admin notice assertion**

In the admin portion of the same spec, after visiting a Barangay Certificate admin page, assert:

```ts
await expect(page.getByText('Processed in BIMS')).toBeVisible();
await expect(page.getByText('Use the BIMS certificate queue')).toBeVisible();
```

- [ ] **Step 3: Run e2e if local stack is available**

Run from `multysis-frontend` with the app stack already running:

```bash
npm run test:e2e -- dynamic-eservice.spec.ts
```

Expected: PASS. If no local stack is running, skip this command and record that it was not run.

- [ ] **Step 4: Commit**

```bash
git add multysis-frontend/e2e/dynamic-eservice.spec.ts
git commit -m "test(eservice): cover BIMS certificate routing"
```

## Task 8: Final Verification

**Files:**
- No code files unless previous tasks reveal failures.

- [ ] **Step 1: Run focused backend tests**

Run from `multysis-backend`:

```bash
npx jest src/services/__tests__/certificate-template.service.test.ts src/services/__tests__/transaction-barangay-certificate.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run backend build**

Run from `multysis-backend`:

```bash
npm run build
```

Expected: TypeScript build succeeds.

- [ ] **Step 3: Run BIMS backend build**

Run from `barangay-information-management-system-copy/server`:

```bash
npm run build
```

Expected: Node syntax checks succeed.

- [ ] **Step 4: Run frontend build**

Run from `multysis-frontend`:

```bash
npm run build
```

Expected: build succeeds; the known logger chunk warning may remain.

- [ ] **Step 5: Manual local smoke checklist**

Use browser or Playwright against a running local stack:

```text
1. Log in as an approved resident with barangay_id.
2. Open /portal/e-government.
3. Open Barangay Certificate Services.
4. Confirm listed certificates come from active BIMS templates.
5. Submit a certificate request with purpose.
6. Confirm a reference number appears.
7. Log in to BIMS as barangay staff.
8. Open /admin/barangay/certificates.
9. Confirm the portal request appears with the selected certificate_type.
10. Preview/download the certificate.
11. Update status to PROCESSING or FOR_RELEASE.
12. Return to eService resident applications and confirm the status label displays correctly.
```

- [ ] **Step 6: Do not run production writes yet**

Before deployment smoke tests, get explicit approval for:

```text
1. Canonical Barangay Certificate transport service row: create BRGY_CERTIFICATE if missing or select an existing row.
2. BIMS barangay staff account details and target barangay.
```

- [ ] **Step 7: Commit verification-only docs if changed**

If this task adds a short verification note, commit it:

```bash
git add docs/superpowers/plans/2026-07-17-barangay-certificate-bims-routing-plan.md
git commit -m "docs: plan certificate BIMS routing"
```

## Self-Review

- Spec coverage: the plan covers resident template catalog, server-side create guard, template validation, projected response fields, BIMS queue JSON resolution, eService admin mutation blocking, status mapping, tests, and no-migration/no-production-write boundaries.
- Placeholder scan: no `TBD`, `TODO`, or open-ended implementation placeholders are present.
- Type consistency: template DTO uses `certificateType` in TypeScript and maps to `certificate_type` only at DB/API payload boundaries; portal transaction data uses `service_data.certificate_type` / `serviceData.certificate_type` consistently.
