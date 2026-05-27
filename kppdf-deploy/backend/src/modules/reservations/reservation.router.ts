import { createCrudRouter } from '../../utils/crud-factory';
import { ReservationModel } from './reservation.model';

export const reservationRouter = createCrudRouter(ReservationModel, undefined, undefined, 'warehouse.reservations');
