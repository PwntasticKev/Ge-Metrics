import React from 'react';
import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import {Line} from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);


export function LineChart({data, timeframe}) {
    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: `GE Metric data ${timeframe}`,
            },
        },
    };

    // Convert the data object into an array
    const dataArray = Object.values(data);

    // Sort the data based on the highTime property in ascending order
    dataArray.sort((a, b) => a.highTime - b.highTime);

    const chartData = {
        labels: dataArray.map(item => item.highTime),
        datasets: [
            {
                label: 'Average High Price',
                data: dataArray.map(item => item.high),
                borderColor: 'red',
                fill: false,
            },
            {
                label: 'Average Low Price',
                data: dataArray.map(item => item.low),
                borderColor: 'blue',
                fill: false,
            },
        ],
    };

    return <Line options={options} data={chartData}/>;
}
