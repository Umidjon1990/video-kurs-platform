// ============ TEST MARKETPLACE API ROUTES (MINIMAL) ============
// These routes will be added to main server/routes.ts after fixing it

import { Router } from 'express';

export function setupTestMarketplaceRoutes(app: any, storage: any, isAuthenticated: any, isAdmin: any) {
  
  // ============ PUBLIC ROUTES ============
  // Get all published standalone tests (not part of any course)
  app.get('/api/public/tests', async (req: any, res: any) => {
    try {
      const tests = await storage.getPublicTests();
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all published standalone speaking tests
  app.get('/api/public/speaking-tests', async (req: any, res: any) => {
    try {
      const speakingTests = await storage.getPublicSpeakingTests();
      res.json(speakingTests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ STUDENT ROUTES ============
  // Purchase a standalone test
  app.post('/api/student/test-purchase', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const { testId, speakingTestId, testType, paymentMethod, paymentProofUrl } = req.body;
      
      if ((!testId && !speakingTestId) || (testId && speakingTestId)) {
        return res.status(400).json({ message: 'testId yoki speakingTestId dan faqat bittasini kiriting' });
      }
      
      const existingEnrollment = await storage.checkTestEnrollment(
        userId,
        testId || speakingTestId,
        testType
      );
      if (existingEnrollment) {
        return res.status(400).json({ message: 'Siz bu testni allaqachon sotib olgan' });
      }
      
      const enrollment = await storage.createTestEnrollment({
        userId,
        testId: testId || null,
        speakingTestId: speakingTestId || null,
        testType,
        paymentMethod,
        paymentProofUrl,
        paymentStatus: 'pending',
      });
      
      res.json(enrollment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get student's test enrollments
  app.get('/api/student/test-enrollments', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const enrollments = await storage.getTestEnrollmentsByUser(userId);
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check test access
  app.get('/api/student/test-enrollment/:testId/:testType', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const { testId, testType } = req.params;
      
      const enrollment = await storage.checkTestEnrollment(userId, testId, testType as 'standard' | 'speaking');
      res.json({ hasAccess: !!enrollment, enrollment });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ ADMIN ROUTES ============
  // Get all pending test payments
  app.get('/api/admin/test-payments/pending', isAuthenticated, isAdmin, async (req: any, res: any) => {
    try {
      const pendingPayments = await storage.getPendingTestPayments();
      res.json(pendingPayments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Approve/reject test enrollment
  app.patch('/api/admin/test-enrollments/:enrollmentId/status', isAuthenticated, isAdmin, async (req: any, res: any) => {
    try {
      const { enrollmentId } = req.params;
      const { status } = req.body; // 'approved' or 'rejected'
      
      const updated = await storage.updateTestEnrollmentStatus(enrollmentId, status);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
}
