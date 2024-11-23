// Firebase configuration and initialization
const firebaseConfig = {
    apiKey: "AIzaSyCHz3DYeMDXfgCUpZdT7-6tSG-9rRbyLxU",
    authDomain: "iot-monitor-82e25.firebaseapp.com",
    databaseURL: "https://iot-monitor-82e25-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "iot-monitor-82e25",
    storageBucket: "iot-monitor-82e25.appspot.com",
    messagingSenderId: "197140648440",
    appId: "1:197140648440:web:66cf90bfe3c0807b70860d"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const deviceSelectMenu = document.getElementById('device-select-menu');
const motorSelectMenu = document.getElementById('motor-select-menu');
const timerForm = document.getElementById('timer-form');
const logsList = document.getElementById('logs-list');

// Fetch devices from Firebase
function fetchDevices() {
    const devicesRef = database.ref('devices/');
    devicesRef.on('value', (snapshot) => {
        const devices = snapshot.val();
        console.log('Devices fetched:', devices);

        // // Clear existing options
        // deviceSelectMenu.innerHTML = '<option disabled selected>Select a Device</option>';

        // if (!devices) {
        //     console.error('No devices found in the database.');
        //     deviceSelectMenu.innerHTML += '<option disabled>No Devices Found</option>';
        //     return;
        // }

        for (let deviceId in devices) {
            const option = document.createElement('option');
            option.value = deviceId;
            option.textContent = devices[deviceId].name || `Device ${deviceId}`;
            deviceSelectMenu.appendChild(option);
        }
    }, (error) => {
        console.error('Error fetching devices:', error);
        alert('Failed to load devices. Please check your Firebase configuration.');
    });
}

// Fetch motors for the selected device
deviceSelectMenu.addEventListener('change', (event) => {
    const selectedDevice = event.target.value;

    if (selectedDevice) {
        const motorsRef = database.ref(`devices/${selectedDevice}/motors`);
        motorsRef.on('value', (snapshot) => {
            const motors = snapshot.val();
            console.log('Motors fetched for device:', selectedDevice, motors);

            // motorSelectMenu.innerHTML = '<option disabled selected>Select a Motor</option>';

            // if (!motors) {
            //     console.error(`No motors found for device: ${selectedDevice}`);
            //     motorSelectMenu.innerHTML += '<option disabled>No Motors Found</option>';
            //     return;
            // }

            for (let motorId in motors) {
                const option = document.createElement('option');
                option.value = motorId;
                option.textContent = motors[motorId].name || `Motor ${motorId}`;
                motorSelectMenu.appendChild(option);
            }
        });
    }
});

// Timer form submission
timerForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const selectedDevice = deviceSelectMenu.value;
    const selectedMotor = motorSelectMenu.value;
    const date = document.getElementById('date-select').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;

    const currentTimeEpoch = Date.now();

    console.log("Form Data:", { selectedDevice, selectedMotor, date, startTime, endTime });
    console.log("Current Time (Epoch):", currentTimeEpoch);

    // Parse input timings into epoch
    const startTimeEpoch = new Date(`${date}T${startTime}:00`).getTime();
    const endTimeEpoch = new Date(`${date}T${endTime}:00`).getTime();

    console.log("Parsed Times:", { startTimeEpoch, endTimeEpoch });

    if (!selectedDevice || !selectedMotor || !date || !startTime || !endTime) {
        alert('Please fill out all fields.');
        return;
    }

    if (isNaN(startTimeEpoch) || isNaN(endTimeEpoch)) {
        console.error("Invalid Date or Time format. Cannot parse into epoch.");
        alert('Invalid date or time format. Please check your input.');
        return;
    }

    if (startTimeEpoch < currentTimeEpoch || endTimeEpoch < currentTimeEpoch) {
        console.error("Timing Validation Failed: Start or end time is in the past.");
        alert('Invalid schedule: Start time or end time cannot be in the past.');
        return;
    }

    if (endTimeEpoch <= startTimeEpoch) {
        console.error("Timing Validation Failed: End time is earlier than or equal to start time.");
        alert('Invalid schedule: End time must be later than start time.');
        return;
    }

    console.log("Timer Validation Passed.");

    // Push valid timer data to Firebase
    const timerData = {
        startTime: startTimeEpoch,
        endTime: endTimeEpoch,
        createdAt: Date.now(),
    };

    const schedulesRef = database.ref(`devices/${selectedDevice}/motors/${selectedMotor}/schedules`);
    schedulesRef.push(timerData)
        .then(() => {
            alert('Timer set successfully!');
            console.log("Timer set successfully:", timerData);
        })
        .catch((error) => {
            console.error('Error setting timer:', error);
            alert('Failed to set timer. Please try again.');
        });
});

// Update motor state based on schedule and remove completed schedules
function updateMotorState() {
    const currentTimeEpoch = Date.now();
    const devicesRef = database.ref('devices/');

    devicesRef.once('value', (snapshot) => {
        snapshot.forEach(deviceSnapshot => {
            const deviceId = deviceSnapshot.key;
            const motors = deviceSnapshot.val()?.motors;

            if (!motors) return;

            for (let motorId in motors) {
                const schedules = motors[motorId]?.schedules || {};
                let motorState = 'OFF';

                for (let scheduleId in schedules) {
                    const schedule = schedules[scheduleId];

                    if (currentTimeEpoch >= schedule.startTime && currentTimeEpoch <= schedule.endTime) {
                        motorState = 'ON';
                    } else if (currentTimeEpoch > schedule.endTime) {
                        // Remove schedule if it has completed
                        const scheduleRef = database.ref(`devices/${deviceId}/motors/${motorId}/schedules/${scheduleId}`);
                        scheduleRef.remove()
                            .then(() => {
                                console.log(`Completed schedule ${scheduleId} for motor ${motorId} deleted.`);
                            })
                            .catch((error) => {
                                console.error(`Error deleting schedule ${scheduleId}:`, error);
                            });
                    }
                }

                // Update the motor state in Firebase
                const motorStateRef = database.ref(`devices/${deviceId}/motors/${motorId}/motorState`);
                motorStateRef.set(motorState)
                    .then(() => {
                        console.log(`Motor ${motorId} state updated to ${motorState}`);
                    })
                    .catch((error) => {
                        console.error(`Error updating motor state for ${motorId}:`, error);
                    });
            }
        });
    });
}


// Fetch logs from Firebase
function fetchLogs() {
    const logsRef = database.ref('logs/');
    logsRef.on('value', (snapshot) => {
        const logs = snapshot.val();
        logsList.innerHTML = ''; // Clear the logs list
        for (let logId in logs) {
            const li = document.createElement('li');
            li.textContent = `${logs[logId].timestamp}: ${logs[logId].message}`;
            logsList.appendChild(li);
        }
    });
}

// Initialize data fetching
fetchDevices();
fetchLogs();

// Call updateMotorState every second to update motor states based on schedules
setInterval(updateMotorState, 1000);
