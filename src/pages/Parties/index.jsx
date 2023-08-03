import {Flex, Grid} from '@mantine/core';

export default function Parties() {
    return <>
        <Grid grow>
            <Grid.Col span={4}>
                <Flex direction="column">
                    <div>Chart</div>
                    <div>Sell Orders</div>
                </Flex>
            </Grid.Col>

            <Grid.Col span={2}>
                <div>Live Buy Offers</div>
            </Grid.Col>

            <Grid.Col span={4}>
                <Flex direction="column">
                    <div>Create Order</div>
                    <div>Live Sell Orders</div>
                </Flex>
            </Grid.Col>
        </Grid>
    </>
}