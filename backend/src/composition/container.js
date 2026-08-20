const pool = require('../infrastructure/db/pool');
const PgTransactionManager = require('../infrastructure/db/PgTransactionManager');
const PgUserRepository = require('../infrastructure/db/repositories/PgUserRepository');
const PgEventRepository = require('../infrastructure/db/repositories/PgEventRepository');
const PgPrizeRepository = require('../infrastructure/db/repositories/PgPrizeRepository');
const PgEntryRepository = require('../infrastructure/db/repositories/PgEntryRepository');
const PgRefreshTokenRepository = require('../infrastructure/db/repositories/PgRefreshTokenRepository');
const JwtTokenService = require('../infrastructure/security/JwtTokenService');
const BcryptPasswordHasher = require('../infrastructure/security/BcryptPasswordHasher');
const { loadEnv } = require('../infrastructure/config/env');

const SignupUseCase = require('../application/usecases/auth/SignupUseCase');
const LoginUseCase = require('../application/usecases/auth/LoginUseCase');
const RefreshTokenUseCase = require('../application/usecases/auth/RefreshTokenUseCase');
const LogoutUseCase = require('../application/usecases/auth/LogoutUseCase');

const CreateEventUseCase = require('../application/usecases/events/CreateEventUseCase');
const UpdateEventUseCase = require('../application/usecases/events/UpdateEventUseCase');
const CloseEventUseCase = require('../application/usecases/events/CloseEventUseCase');
const ListEventsUseCase = require('../application/usecases/events/ListEventsUseCase');
const GetEventUseCase = require('../application/usecases/events/GetEventUseCase');
const DeleteEventUseCase = require('../application/usecases/events/DeleteEventUseCase');

const CreateEntryUseCase = require('../application/usecases/entries/CreateEntryUseCase');
const ListEntriesUseCase = require('../application/usecases/entries/ListEntriesUseCase');
const UpdateConsentNoteUseCase = require('../application/usecases/entries/UpdateConsentNoteUseCase');
const ExportEntriesCsvUseCase = require('../application/usecases/entries/ExportEntriesCsvUseCase');

const ListMyEntriesUseCase = require('../application/usecases/mypage/ListMyEntriesUseCase');
const GetProfileUseCase = require('../application/usecases/mypage/GetProfileUseCase');
const UpdateProfileUseCase = require('../application/usecases/mypage/UpdateProfileUseCase');
const ChangePasswordUseCase = require('../application/usecases/mypage/ChangePasswordUseCase');
const CancelEntryUseCase = require('../application/usecases/mypage/CancelEntryUseCase');

const { createAuthController } = require('../interfaces/http/controllers/authController');
const { createEventsController } = require('../interfaces/http/controllers/eventsController');
const { createEntriesController } = require('../interfaces/http/controllers/entriesController');
const { createMypageController } = require('../interfaces/http/controllers/mypageController');
const { createAuthMiddleware } = require('../interfaces/http/middleware/auth');

/** 합성 루트: 프레임워크(express/pg/jwt/bcrypt)에 의존하는 구체 구현을 만들어 유스케이스에 주입하고,
 * 완성된 컨트롤러/미들웨어만 밖으로 내보낸다. 이 파일 밖에서는 어떤 계층도 다른 계층의 구체 구현을 직접 알지 못한다. */
function buildContainer() {
  const env = loadEnv();

  const transactionManager = new PgTransactionManager(pool);
  const userRepository = new PgUserRepository(pool);
  const eventRepository = new PgEventRepository(pool);
  const prizeRepository = new PgPrizeRepository(pool);
  const entryRepository = new PgEntryRepository(pool);
  const refreshTokenRepository = new PgRefreshTokenRepository(pool);
  const tokenService = new JwtTokenService({
    secret: env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '14d',
  });
  const passwordHasher = new BcryptPasswordHasher();

  const signupUseCase = new SignupUseCase({ userRepository, passwordHasher });
  const loginUseCase = new LoginUseCase({ userRepository, passwordHasher, tokenService, refreshTokenRepository });
  const refreshTokenUseCase = new RefreshTokenUseCase({ userRepository, tokenService, refreshTokenRepository });
  const logoutUseCase = new LogoutUseCase({ tokenService, refreshTokenRepository });

  const createEventUseCase = new CreateEventUseCase({ eventRepository, prizeRepository, transactionManager });
  const updateEventUseCase = new UpdateEventUseCase({ eventRepository, prizeRepository, transactionManager });
  const closeEventUseCase = new CloseEventUseCase({ eventRepository, prizeRepository });
  const listEventsUseCase = new ListEventsUseCase({ eventRepository, prizeRepository });
  const getEventUseCase = new GetEventUseCase({ eventRepository, prizeRepository });
  const deleteEventUseCase = new DeleteEventUseCase({ eventRepository });

  const createEntryUseCase = new CreateEntryUseCase({
    eventRepository,
    prizeRepository,
    entryRepository,
    transactionManager,
  });
  const listEntriesUseCase = new ListEntriesUseCase({ eventRepository, entryRepository });
  const updateConsentNoteUseCase = new UpdateConsentNoteUseCase({ entryRepository });
  const exportEntriesCsvUseCase = new ExportEntriesCsvUseCase({ eventRepository, entryRepository });

  const listMyEntriesUseCase = new ListMyEntriesUseCase({ entryRepository });
  const getProfileUseCase = new GetProfileUseCase({ userRepository });
  const updateProfileUseCase = new UpdateProfileUseCase({ userRepository });
  const changePasswordUseCase = new ChangePasswordUseCase({ userRepository, passwordHasher });
  const cancelEntryUseCase = new CancelEntryUseCase({ entryRepository });

  const authController = createAuthController({
    signupUseCase,
    loginUseCase,
    refreshTokenUseCase,
    logoutUseCase,
  });
  const eventsController = createEventsController({
    listEventsUseCase,
    getEventUseCase,
    createEventUseCase,
    updateEventUseCase,
    closeEventUseCase,
    deleteEventUseCase,
  });
  const entriesController = createEntriesController({
    createEntryUseCase,
    listEntriesUseCase,
    updateConsentNoteUseCase,
    exportEntriesCsvUseCase,
  });
  const mypageController = createMypageController({
    listMyEntriesUseCase,
    getProfileUseCase,
    updateProfileUseCase,
    changePasswordUseCase,
    cancelEntryUseCase,
  });

  const authMiddleware = createAuthMiddleware(tokenService);

  return { authController, eventsController, entriesController, mypageController, authMiddleware };
}

module.exports = { buildContainer };
