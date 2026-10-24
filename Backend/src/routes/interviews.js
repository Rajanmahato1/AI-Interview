const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  createSession, getSessions, getSession, startSession,
  nextQuestion, submitAnswer, evaluateAnswer, completeSession, resumeSession, deleteSession,
  finishSession, getInterviewReport
} = require('../controllers/interviewController');

router.post('/', auth, createSession);
router.get('/', auth, getSessions);
router.get('/:id/report', auth, getInterviewReport);
router.post('/:id/finish', auth, finishSession);
router.get('/:id', auth, getSession);
router.post('/:id/start', auth, startSession);
router.post('/:id/next-question', auth, nextQuestion);
router.post('/:id/answers', auth, submitAnswer);
router.post('/:id/answers/:answerId/evaluate', auth, evaluateAnswer);
router.post('/:id/complete', auth, completeSession);
router.post('/:id/resume', auth, resumeSession);
router.delete('/:id', auth, deleteSession);

module.exports = router;
