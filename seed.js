
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Club = require("./models/Club");
const Event = require("./models/Event");

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("Connected to:", mongoose.connection.name);

        // Create or reuse the demo accounts.
        async function getOrCreateUser(data) {
            let user = await User.findOne({ email: data.email });

            if (!user) {
                const hashedPassword = await bcrypt.hash(
                    "Sowmiya0722",
                    12
                );

                user = await User.create({
                    ...data,
                    password: hashedPassword
                });

                console.log("Created account:", data.email);
            } else {
                console.log("Reusing account:", data.email);
            }

            return user;
        }

        const admin = await getOrCreateUser({
            name: "Admin Skss",
            email: "skss0722@gmail.com",
            role: "admin",
            department: "Administration"
        });

        const coordinatorA = await getOrCreateUser({
            name: "Yadhavi",
            email: "yadhavi17@vitstudent.ac.in",
            role: "coordinator",
            department: "Computer Science"
        });

        const coordinatorB = await getOrCreateUser({
            name: "Divya",
            email: "divya24@vitstudent.ac.in",
            role: "coordinator",
            department: "Student Activities"
        });

        await getOrCreateUser({
            name: "Magima",
            email: "magima@vitstudent.ac.in",
            role: "student",
            department: "Computer Science",
            studentId: "STU001"
        });

        // Four clubs, with two assigned to each coordinator.
        const clubData = [
            {
                name: "Coding Club",
                description: "Learn programming, solve challenges and build software projects.",
                category: "Technology",
                coordinator: coordinatorA.name,
                coordinatorUser: coordinatorA._id,
                meetingDay: "Monday"
            },
            {
                name: "Robotics Club",
                description: "Explore robotics, automation and embedded systems.",
                category: "Technology",
                coordinator: coordinatorA.name,
                coordinatorUser: coordinatorA._id,
                meetingDay: "Wednesday"
            },
            {
                name: "Cultural Club",
                description: "Celebrate culture through music, dance and performances.",
                category: "Cultural",
                coordinator: coordinatorB.name,
                coordinatorUser: coordinatorB._id,
                meetingDay: "Thursday"
            },
            {
                name: "Photography Club",
                description: "Develop photography skills and explore visual storytelling.",
                category: "Arts",
                coordinator: coordinatorB.name,
                coordinatorUser: coordinatorB._id,
                meetingDay: "Friday"
            }
        ];

        const clubs = [];

        for (const data of clubData) {
            let club = await Club.findOne({ name: data.name });

            if (!club) {
                club = await Club.create(data);
                console.log("Created club:", club.name);
            } else {
                club.coordinator = data.coordinator;
                club.coordinatorUser = data.coordinatorUser;
                await club.save();
                console.log("Updated coordinator:", club.name);
            }

            clubs.push(club);
        }

        // Two events for each club.
        // Dates are in the future relative to October 2026.
        const eventData = [
            {
                clubName: "Coding Club",
                title: "Web Development Workshop",
                description: "Build your first responsive website using modern web technologies.",
                date: new Date("2026-11-05T10:00:00"),
                venue: "Computer Lab 1"
            },
            {
                clubName: "Coding Club",
                title: "Inter-College Coding Challenge",
                description: "Test your problem-solving and programming skills.",
                date: new Date("2026-11-12T09:00:00"),
                venue: "Seminar Hall"
            },
            {
                clubName: "Robotics Club",
                title: "Arduino Hands-on Workshop",
                description: "Learn microcontroller basics and build a simple circuit.",
                date: new Date("2026-11-07T10:00:00"),
                venue: "Robotics Laboratory"
            },
            {
                clubName: "Robotics Club",
                title: "Mini Robot Competition",
                description: "Design and demonstrate a working mini robot.",
                date: new Date("2026-11-19T11:00:00"),
                venue: "Innovation Lab"
            },
            {
                clubName: "Cultural Club",
                title: "Talent Showcase",
                description: "A stage for students to showcase singing, dancing and other talents.",
                date: new Date("2026-11-10T14:00:00"),
                venue: "College Auditorium"
            },
            {
                clubName: "Cultural Club",
                title: "Cultural Fest",
                description: "Celebrate student creativity through performances and activities.",
                date: new Date("2026-11-26T10:00:00"),
                venue: "Main Auditorium"
            },
            {
                clubName: "Photography Club",
                title: "Campus Photography Walk",
                description: "Capture campus life and practise composition techniques.",
                date: new Date("2026-11-09T08:00:00"),
                venue: "Main Campus"
            },
            {
                clubName: "Photography Club",
                title: "Photo Exhibition",
                description: "Display student photographs and share visual stories.",
                date: new Date("2026-11-23T11:00:00"),
                venue: "Exhibition Hall"
            }
        ];

        for (const data of eventData) {
            const club = clubs.find(
                item => item.name === data.clubName
            );

            const existingEvent = await Event.findOne({
                title: data.title,
                club: club._id
            });

            if (!existingEvent) {
                await Event.create({
                    title: data.title,
                    description: data.description,
                    club: club._id,
                    date: data.date,
                    venue: data.venue,
                    createdBy:
                        club.coordinatorUser || admin._id
                });

                console.log("Created event:", data.title);
            } else {
                console.log("Event already exists:", data.title);
            }
        }

        console.log("\nDATABASE SEEDING COMPLETED!");
        console.log("Users: 1 admin, 2 coordinators, 1 demo student");
        console.log("Clubs: 4");
        console.log("Events: 8");
        console.log("Temporary password: Sowmiya0722");
    } catch (error) {
        console.error("Database seeding failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seedDatabase();
