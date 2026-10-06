/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management routes
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create booking with seat locking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - showId
 *               - seatIds
 *             properties:
 *               showId:
 *                 type: string
 *                 example: 64f1b2c3d4e5f6a7b8c9d0e1
 *               seatIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - 64f1b2c3d4e5f6a7b8c9d0e2
 *                   - 64f1b2c3d4e5f6a7b8c9d0e3
 *     responses:
 *       201:
 *         description: Booking created with 5 minute seat lock
 *       400:
 *         description: Seats already booked or invalid seats
 *       401:
 *         description: Unauthorized
 */


/**
 * @swagger
 * /api/bookings/show/{showId}/availability:
 *   get:
 *     summary: Get seat availability for a show
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: showId
 *         required: true
 *         schema:
 *           type: string
 *         description: Show id
 *     responses:
 *       200:
 *         description: List of all seats with availability status
 *       404:
 *         description: Show not found
 */

/**
 * @swagger
 * /api/bookings/{bookingId}/confirm:
 *   patch:
 *     summary: Confirm booking and process payment
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking id
 *     responses:
 *       200:
 *         description: Booking confirmed and payment processed
 *       400:
 *         description: Booking expired or already confirmed
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/bookings/{bookingId}/cancel:
 *   patch:
 *     summary: Cancel booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking id
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Cannot cancel within 2 hours of showtime
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/bookings/me:
 *   get:
 *     summary: Get my bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user bookings with full details
 *       401:
 *         description: Unauthorized
 */