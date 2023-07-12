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


export function LineChart(data, timeframe) {

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

    const chartData = {
        labels: data.data.map(item => item.timestamp),
        datasets: [
            {
                label: 'Average High Price',
                data: data.data.map(item => item.avgHighPrice),
                borderColor: 'red',
                fill: false
            },
            {
                label: 'Average Low Price',
                data: data.data.map(item => item.avgLowPrice),
                borderColor: 'blue',
                fill: false
            }
        ]
    };

    return <Line options={options} data={chartData}/>;
}
