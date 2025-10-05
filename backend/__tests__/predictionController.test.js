const request = require('supertest');
const express = require('express');
const predictionController = require('../controllers/predictionController');
const supabase = require('../db/supabase');
const predictionScoringService = require('../services/predictionScoringService');

// Mock dependencies
jest.mock('../db/supabase');
jest.mock('../services/predictionScoringService');

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  req.user = { id: 1, username: 'testuser', is_admin: false };
  next();
};

const mockAdminAuth = (req, res, next) => {
  req.user = { id: 1, username: 'admin', is_admin: true };
  next();
};

// Setup routes
app.post('/api/predictions', mockAuth, predictionController.submitPredictions);
app.get('/api/predictions/current', mockAuth, predictionController.getCurrentPredictions);
app.get('/api/predictions/history', mockAuth, predictionController.getPredictionHistory);
app.get('/api/episodes/:episodeId/predictions', mockAdminAuth, predictionController.getEpisodePredictions);
app.put('/api/episodes/:episodeId/lock-predictions', mockAdminAuth, predictionController.togglePredictionLock);
app.get('/api/predictions/statistics', mockAdminAuth, predictionController.getPredictionStatistics);

describe('Prediction Controller API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create a mock query builder
  const createQueryBuilder = (finalResult) => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(finalResult),
      single: jest.fn().mockResolvedValue(finalResult),
      limit: jest.fn().mockResolvedValue(finalResult),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue(finalResult)
    };
    return builder;
  };

  describe('POST /api/predictions', () => {
    test('should submit valid predictions successfully', async () => {
      // Setup mocks for the entire flow
      supabase.from = jest.fn()
        // First call: episode check
        .mockReturnValueOnce(createQueryBuilder({
          data: { id: 5, episode_number: 5, predictions_locked: false },
          error: null
        }))
        // Second call: duplicate check
        .mockReturnValueOnce(createQueryBuilder({
          data: [],
          error: null
        }))
        // Third call: first contestant validation
        .mockReturnValueOnce(createQueryBuilder({
          data: { 
            id: 10, 
            name: 'Jonathan', 
            current_tribe: 'Taku', 
            is_eliminated: false 
          },
          error: null
        }))
        // Fourth call: second contestant validation
        .mockReturnValueOnce(createQueryBuilder({
          data: { 
            id: 11, 
            name: 'Maryanne', 
            current_tribe: 'Vati', 
            is_eliminated: false 
          },
          error: null
        }))
        // Fifth call: insert predictions
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [
                { id: 101, tribe: 'Taku', contestant_id: 10 },
                { id: 102, tribe: 'Vati', contestant_id: 11 }
              ],
              error: null
            })
          })
        });

      const response = await request(app)
        .post('/api/predictions')
        .send({
          episode_id: 5,
          predictions: [
            { tribe: 'Taku', contestant_id: 10 },
            { tribe: 'Vati', contestant_id: 11 }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Predictions submitted successfully');
      expect(response.body.predictions).toHaveLength(2);
    });

    test('should reject submission when predictions are locked', async () => {
      supabase.from = jest.fn().mockReturnValueOnce(createQueryBuilder({
        data: { id: 5, episode_number: 5, predictions_locked: true },
        error: null
      }));

      const response = await request(app)
        .post('/api/predictions')
        .send({
          episode_id: 5,
          predictions: [
            { tribe: 'Taku', contestant_id: 10 }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Predictions are locked for this episode');
    });

    test('should reject duplicate submission', async () => {
      supabase.from = jest.fn()
        .mockReturnValueOnce(createQueryBuilder({
          data: { id: 5, episode_number: 5, predictions_locked: false },
          error: null
        }))
        .mockReturnValueOnce(createQueryBuilder({
          data: [{ id: 100 }],
          error: null
        }));

      const response = await request(app)
        .post('/api/predictions')
        .send({
          episode_id: 5,
          predictions: [
            { tribe: 'Taku', contestant_id: 10 }
          ]
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('You have already submitted predictions for this episode');
    });

    test('should reject prediction with invalid contestant/tribe mismatch', async () => {
      supabase.from = jest.fn()
        .mockReturnValueOnce(createQueryBuilder({
          data: { id: 5, episode_number: 5, predictions_locked: false },
          error: null
        }))
        .mockReturnValueOnce(createQueryBuilder({
          data: [],
          error: null
        }))
        .mockReturnValueOnce(createQueryBuilder({
          data: { 
            id: 10, 
            name: 'Jonathan', 
            current_tribe: 'Vati',  // Different tribe
            is_eliminated: false 
          },
          error: null
        }));

      const response = await request(app)
        .post('/api/predictions')
        .send({
          episode_id: 5,
          predictions: [
            { tribe: 'Taku', contestant_id: 10 }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Contestant Jonathan is not in tribe Taku');
    });

    test('should reject prediction for eliminated contestant', async () => {
      supabase.from = jest.fn()
        .mockReturnValueOnce(createQueryBuilder({
          data: { id: 5, episode_number: 5, predictions_locked: false },
          error: null
        }))
        .mockReturnValueOnce(createQueryBuilder({
          data: [],
          error: null
        }))
        .mockReturnValueOnce(createQueryBuilder({
          data: { 
            id: 10, 
            name: 'Jonathan', 
            current_tribe: 'Taku', 
            is_eliminated: true 
          },
          error: null
        }));

      const response = await request(app)
        .post('/api/predictions')
        .send({
          episode_id: 5,
          predictions: [
            { tribe: 'Taku', contestant_id: 10 }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot predict eliminated contestant: Jonathan');
    });

    test('should reject submission with missing required fields', async () => {
      const response = await request(app)
        .post('/api/predictions')
        .send({
          episode_id: 5
          // Missing predictions array
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('episode_id and predictions array are required');
    });

    test('should reject submission with empty predictions array', async () => {
      const response = await request(app)
        .post('/api/predictions')
        .send({
          episode_id: 5,
          predictions: []
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('At least one prediction is required');
    });

    test('should reject submission for non-existent episode', async () => {
      supabase.from = jest.fn().mockReturnValueOnce(createQueryBuilder({
        data: null,
        error: null
      }));

      const response = await request(app)
        .post('/api/predictions')
        .send({
          episode_id: 999,
          predictions: [
            { tribe: 'Taku', contestant_id: 10 }
          ]
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Episode not found');
    });
  });

  describe('GET /api/predictions/current', () => {
    test('should return current predictions for user', async () => {
      supabase.from = jest.fn()
        .mockReturnValueOnce(createQueryBuilder({
          data: { id: 5, episode_number: 5, predictions_locked: false },
          error: null
        }))
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 101,
                    tribe: 'Taku',
                    contestant_id: 10,
                    is_correct: null,
                    scored_at: null,
                    created_at: '2024-01-01',
                    contestants: {
                      id: 10,
                      name: 'Jonathan',
                      image_url: 'image.jpg',
                      current_tribe: 'Taku'
                    }
                  }
                ],
                error: null
              })
            })
          })
        });

      const response = await request(app)
        .get('/api/predictions/current');

      expect(response.status).toBe(200);
      expect(response.body.episode).toBeDefined();
      expect(response.body.predictions).toBeDefined();
      expect(response.body.has_submitted).toBe(true);
    });

    test('should handle no current episode', async () => {
      supabase.from = jest.fn().mockReturnValueOnce(createQueryBuilder({
        data: null,
        error: null
      }));

      const response = await request(app)
        .get('/api/predictions/current');

      expect(response.status).toBe(200);
      expect(response.body.episode).toBeNull();
      expect(response.body.message).toBe('No current episode available');
    });
  });

  describe('GET /api/predictions/history', () => {
    test('should return prediction history with pagination', async () => {
      supabase.from = jest.fn()
        .mockReturnValueOnce(createQueryBuilder({
          data: [
            {
              id: 101,
              tribe: 'Taku',
              contestant_id: 10,
              is_correct: true,
              scored_at: '2024-01-01',
              created_at: '2024-01-01',
              episode_id: 5,
              episodes: {
                id: 5,
                episode_number: 5,
                aired_date: '2024-01-01'
              },
              contestants: {
                id: 10,
                name: 'Jonathan',
                image_url: 'image.jpg'
              }
            }
          ],
          error: null
        }))
        .mockReturnValueOnce(createQueryBuilder({
          data: [
            {
              contestant_id: 10,
              contestants: {
                id: 10,
                name: 'Jonathan',
                image_url: 'image.jpg',
                current_tribe: 'Taku'
              },
              event_types: { name: 'eliminated' }
            }
          ],
          error: null
        }));

      predictionScoringService.calculatePredictionAccuracy.mockResolvedValue({
        total: 5,
        correct: 3,
        accuracy: 60.0
      });

      const response = await request(app)
        .get('/api/predictions/history')
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.accuracy).toBeDefined();
      expect(response.body.predictions).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    test('should reject invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/predictions/history')
        .query({ limit: -1, offset: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid pagination parameters');
    });
  });

  describe('GET /api/episodes/:episodeId/predictions (Admin)', () => {
    test('should return all predictions for episode', async () => {
      supabase.from = jest.fn()
        .mockReturnValueOnce(createQueryBuilder({
          data: { id: 5, episode_number: 5, predictions_locked: false },
          error: null
        }))
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 101,
                      player_id: 1,
                      tribe: 'Taku',
                      contestant_id: 10,
                      is_correct: true,
                      scored_at: '2024-01-01',
                      created_at: '2024-01-01',
                      players: {
                        id: 1,
                        username: 'player1',
                        email: 'player1@test.com'
                      },
                      contestants: {
                        id: 10,
                        name: 'Jonathan',
                        image_url: 'image.jpg',
                        current_tribe: 'Taku'
                      }
                    }
                  ],
                  error: null
                })
              })
            })
          })
        });

      const response = await request(app)
        .get('/api/episodes/5/predictions');

      expect(response.status).toBe(200);
      expect(response.body.episode).toBeDefined();
      expect(response.body.predictions_by_tribe).toBeDefined();
      expect(response.body.total_predictions).toBe(1);
    });

    test('should return 404 for non-existent episode', async () => {
      supabase.from = jest.fn().mockReturnValueOnce(createQueryBuilder({
        data: null,
        error: null
      }));

      const response = await request(app)
        .get('/api/episodes/999/predictions');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Episode not found');
    });
  });

  describe('PUT /api/episodes/:episodeId/lock-predictions (Admin)', () => {
    test('should lock predictions successfully', async () => {
      supabase.from = jest.fn()
        .mockReturnValueOnce(createQueryBuilder({
          data: { id: 5, episode_number: 5, predictions_locked: false },
          error: null
        }))
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 5, episode_number: 5, predictions_locked: true },
                  error: null
                })
              })
            })
          })
        });

      const response = await request(app)
        .put('/api/episodes/5/lock-predictions')
        .send({ locked: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Predictions locked successfully');
      expect(response.body.episode.predictions_locked).toBe(true);
    });

    test('should unlock predictions successfully', async () => {
      supabase.from = jest.fn()
        .mockReturnValueOnce(createQueryBuilder({
          data: { id: 5, episode_number: 5, predictions_locked: true },
          error: null
        }))
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 5, episode_number: 5, predictions_locked: false },
                  error: null
                })
              })
            })
          })
        });

      const response = await request(app)
        .put('/api/episodes/5/lock-predictions')
        .send({ locked: false });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Predictions unlocked successfully');
      expect(response.body.episode.predictions_locked).toBe(false);
    });

    test('should reject invalid locked parameter', async () => {
      const response = await request(app)
        .put('/api/episodes/5/lock-predictions')
        .send({ locked: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('locked parameter must be a boolean');
    });

    test('should return 404 for non-existent episode', async () => {
      supabase.from = jest.fn().mockReturnValueOnce(createQueryBuilder({
        data: null,
        error: null
      }));

      const response = await request(app)
        .put('/api/episodes/999/lock-predictions')
        .send({ locked: true });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Episode not found');
    });
  });

  describe('GET /api/predictions/statistics (Admin)', () => {
    test('should return prediction statistics', async () => {
      supabase.from = jest.fn()
        // First call: count players
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 10,
            error: null
          })
        })
        // Second call: get all predictions
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            data: [
              { id: 1, episode_id: 5, player_id: 1, is_correct: true, scored_at: '2024-01-01' },
              { id: 2, episode_id: 5, player_id: 2, is_correct: false, scored_at: '2024-01-01' },
              { id: 3, episode_id: 6, player_id: 1, is_correct: true, scored_at: '2024-01-02' }
            ],
            error: null
          })
        })
        // Third call: episode 5 details
        .mockReturnValueOnce(createQueryBuilder({
          data: { id: 5, episode_number: 5 },
          error: null
        }))
        // Fourth call: episode 6 details
        .mockReturnValueOnce(createQueryBuilder({
          data: { id: 6, episode_number: 6 },
          error: null
        }));

      const response = await request(app)
        .get('/api/predictions/statistics');

      expect(response.status).toBe(200);
      expect(response.body.overall).toBeDefined();
      expect(response.body.by_episode).toBeDefined();
      expect(response.body.overall.total_predictions).toBe(3);
      expect(response.body.overall.correct_predictions).toBe(2);
    });
  });
});
