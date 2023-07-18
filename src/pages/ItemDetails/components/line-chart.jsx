import React, {useState} from 'react';
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
import {useQuery} from "react-query";
import {getItemHistoryById} from "../../../api/rs-wiki-api.jsx";
import {Center, Container, Loader} from "@mantine/core";
import {useParams} from "react-router-dom";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);


export function LineChart() {
    const {id} = useParams();

    const [timeframe, setTimeframe] = useState('1h')

    const {data, status: historyStatus} = useQuery({
        queryKey: ['priceData'],
        queryFn: async () => await getItemHistoryById(timeframe, id),
        // refetchInterval: 60 * 1000,
    });


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

    let chartData = null;

    if (historyStatus === "success" && data) {
        // Sort the data based on the highTime property in ascending order
        console.log(data.data.data, 'datadatadatadatadata')
        const sortedData = data.data.data.sort((a, b) => a.avgHighPrice - b.avgHighPrice);

        chartData = {
            labels: sortedData.map(item => item.avgHighPrice),
            datasets: [
                {
                    label: 'Average High Price',
                    data: sortedData.map(item => item.avgHighPrice),
                    borderColor: 'violet',
                    fill: false,
                },
                {
                    label: 'Average Low Price',
                    data: sortedData.map(item => item.avgLowPrice),
                    borderColor: 'lightblue',
                    fill: false,
                },
            ],
        };
    }

    return (
        <>
            {historyStatus === "error" && <p>Error fetching data</p>}
            {historyStatus === "loading" && (
                <Center maw={400} h={300} mx="auto">
                    <Loader/>
                </Center>
            )}
            {historyStatus === "success" && chartData && (
                <Container size="70rem" px={0}>
                    <Line options={options} data={chartData}/>
                </Container>
            )}
        </>
    );
}

