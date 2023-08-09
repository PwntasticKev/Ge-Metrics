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
import {getItemHistoryById} from "../api/rs-wiki-api.jsx";
import {Center, Container, Loader} from "@mantine/core";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);


export default function LineChart({id}) {

    const [sortedData, setSortedData] = useState([]);

    const [timeframe, setTimeframe] = useState('1h')

    const {data, status: historyStatus} = useQuery({
        queryKey: ['priceData'],
        queryFn: async () => await getItemHistoryById(timeframe, id),
        // refetchInterval: 60 * 1000,
        onSuccess: (data) => {
            // Sort the data and update the sortedData state
            const sorted = data.data.data.sort((a, b) => a.avgHighPrice - b.avgHighPrice);
            setSortedData(sorted);
        },
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
        console.log(sortedData,'sortedData')
        chartData = {
            labels: sortedData.map(item => {
                const localDate = new Date(item.timestamp * 1000).toLocaleString(); // Convert UNIX timestamp to local time
                return localDate;
            }),
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
               <>
                   <button onClick={() => setTimeframe('1hr')}>1hr</button>
                   <button onClick={() => setTimeframe('24hr')}>24hr</button>
                   <Container px={0}>
                       <Line options={options} data={chartData}/>
                   </Container>
               </>
            )}
        </>
    );
}

