const Screen = require("../models/Screen");
const Theater = require("../models/Theater");
const Seat = require("../models/Seat");
const AppError = require("../utils/AppError");
const { withTransaction } = require("../utils/transactionHelper");

exports.createScreen = async (data) => {
	const { theaterId, name, rows, seatsPerRow, layoutType } = data;

	// verify theater exists
	const theater = await Theater.findById(theaterId);
	if (!theater) throw new AppError("Theater not found", 404);

	const existing = await Screen.findOne({ theaterId, name });
	if (existing) throw new AppError("Screen already exists in this theater", 409);

	// total seats
	const totalSeats = rows.length * seatsPerRow;

	return await withTransaction(async (session) => {
		const queryOptions = session ? { session } : {};

		const screen = new Screen({
			theaterId,
			name,
			totalSeats,
			layoutType,
		});
		await screen.save(queryOptions);

		// seat generation
		const seats = [];
		for (let row of rows) {
			for (let num = 1; num <= seatsPerRow; num++) {
				seats.push({
					screenId: screen._id,
					row: row.name,
					number: num,
					type: row.type,
				});
			}
		}

		try {
			await Seat.insertMany(seats, queryOptions);
		} catch (err) {
			if (!session) {
				await Screen.deleteOne({ _id: screen._id });
			}
			throw err;
		}

		return screen;
	});
};

exports.getScreens = async () => {
	return await Screen.find().populate("theaterId", "name city address");
};
