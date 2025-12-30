// Firebase Service for HappyVille Booking System
class FirebaseService {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
    }

    // ============ BOOKINGS ============

    // Create new booking
    async createBooking(bookingData) {
        try {
            const bookingRef = await this.db.collection('bookings').add({
                ...bookingData,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Update availability
            await this.updateAvailability(bookingData.date, bookingData.time,
                bookingData.kids + bookingData.adults);

            return { success: true, id: bookingRef.id };
        } catch (error) {
            console.error('Error creating booking:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all bookings
    async getAllBookings() {
        try {
            const snapshot = await this.db.collection('bookings')
                .orderBy('createdAt', 'desc')
                .get();

            const bookings = [];
            snapshot.forEach(doc => {
                bookings.push({ id: doc.id, ...doc.data() });
            });

            return { success: true, bookings };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get bookings by date
    async getBookingsByDate(date) {
        try {
            const snapshot = await this.db.collection('bookings')
                .where('date', '==', date)
                .get();

            const bookings = [];
            snapshot.forEach(doc => {
                bookings.push({ id: doc.id, ...doc.data() });
            });

            return { success: true, bookings };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Update booking
    async updateBooking(bookingId, updates) {
        try {
            await this.db.collection('bookings').doc(bookingId).update({
                ...updates,
                updatedAt: new Date()
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Delete booking
    async deleteBooking(bookingId) {
        try {
            await this.db.collection('bookings').doc(bookingId).delete();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============ ACTIVITIES ============

    async getActivities() {
        try {
            const snapshot = await this.db.collection('activities').get();

            const activities = {};
            snapshot.forEach(doc => {
                activities[doc.id] = doc.data();
            });

            return { success: true, activities };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============ AVAILABILITY ============

    async getAvailability(date) {
        try {
            const doc = await this.db.collection('availability').doc(date).get();

            if (doc.exists) {
                return { success: true, slots: doc.data().slots || {} };
            } else {
                // Create empty slots for new date
                const slots = this.generateDefaultSlots();
                await this.db.collection('availability').doc(date).set({
                    date: date,
                    slots: slots
                });

                return { success: true, slots };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateAvailability(date, time, change) {
        try {
            const availabilityRef = this.db.collection('availability').doc(date);
            const doc = await availabilityRef.get();

            if (!doc.exists) {
                const slots = this.generateDefaultSlots();
                await availabilityRef.set({ date, slots });
            }

            // Use Firestore increment
            await availabilityRef.update({
                [`slots.${time}.booked`]: firebase.firestore.FieldValue.increment(change)
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    generateDefaultSlots() {
        // Generate default time slots (9AM-6PM, every hour)
        const slots = {};
        for (let hour = 9; hour <= 18; hour++) {
            const time = `${hour.toString().padStart(2, '0')}:00`;
            slots[time] = {
                booked: 0,
                total: 100
            };
        }
        return slots;
    }

    // ============ AUTHENTICATION ============

    async adminLogin(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);

            // Check if user is in admins collection
            const adminDoc = await this.db.collection('admins')
                .where('email', '==', email)
                .get();

            if (!adminDoc.empty) {
                return { success: true, user: userCredential.user };
            } else {
                await this.auth.signOut();
                return { success: false, error: 'Not an admin user' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async adminLogout() {
        try {
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Check if user is admin
    async isAdmin() {
        const user = this.auth.currentUser;
        if (!user) return false;

        const adminDoc = await this.db.collection('admins')
            .where('email', '==', user.email)
            .get();

        return !adminDoc.empty;
    }
}

// Create global instance
window.firebaseService = new FirebaseService();