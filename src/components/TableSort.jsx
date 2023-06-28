import {useState} from 'react';
import {
    createStyles,
    Table,
    ScrollArea,
    UnstyledButton,
    Group,
    Text,
    Center,
    TextInput,
    rem,
    Image,
    Pagination,
    Loader,
    AspectRatio
} from '@mantine/core';
import {keys} from '@mantine/utils';
import {IconSelector, IconChevronDown, IconChevronUp, IconSearch} from '@tabler/icons-react';

const useStyles = createStyles((theme) => ({
    th: {
        padding: '0 !important',
    },

    control: {
        width: '100%',
        padding: `${theme.spacing.xs} ${theme.spacing.md}`,

        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        },
    },

    icon: {
        width: rem(21),
        height: rem(21),
        borderRadius: rem(21),
    },

    header: {
        position: 'sticky',
        top: 0,
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
        transition: 'box-shadow 150ms ease',

        '&::after': {
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            borderBottom: `${rem(1)} solid ${
                theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[2]
            }`,
        },
    },

    scrolled: {
        boxShadow: theme.shadows.sm,
    },

    image: {
        maxWidth: '40%',

        [theme.fn.smallerThan('sm')]: {
            maxWidth: '100%',
        },
    },
}));


function Th({children, reversed, sorted, onSort}) {
    const {classes} = useStyles();
    const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;
    return (
        <th className={classes.th}>
            <UnstyledButton onClick={onSort} className={classes.control}>
                <Group position="apart">
                    <Text fz="sm">
                        {children}
                    </Text>
                    <Center className={classes.icon}>
                        <Icon size="0.9rem" stroke={1.5}/>
                    </Center>
                </Group>
            </UnstyledButton>
        </th>
    );
}

function filterData(data, search) {
    const query = search.toLowerCase().trim();
    return data.filter((item) =>
        Object.keys(item).some((key) => {
            const value = item[key];
            if (typeof value === "string") {
                return value.toLowerCase().includes(query);
            }
            return false;
        })
    );
}

function sortData(
    data,
    payload
) {
    const {sortBy} = payload;

    if (!sortBy) {
        return filterData(data, payload.search);
    }

    return filterData(
        [...data].sort((a, b) => {
            if (payload.reversed) {
                return b[sortBy]?.localeCompare(a[sortBy]);
            }

            return a[sortBy].localeCompare(b[sortBy]);
        }),
        payload.search
    );
}

export function TableSort({data}) {
    const {classes, cx} = useStyles();
    const [search, setSearch] = useState('');
    const [sortedData, setSortedData] = useState(data);
    const [scrolled, setScrolled] = useState(false);
    const [sortBy, setSortBy] = useState(null);
    const [reverseSortDirection, setReverseSortDirection] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;


    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageData = sortedData.slice(startIndex, endIndex);


    const setSorting = (field) => {
        const reversed = field === sortBy ? !reverseSortDirection : false;
        setReverseSortDirection(reversed);
        setSortBy(field);
        setSortedData(sortData(data, {sortBy: field, reversed, search}));
    };

    const handleSearchChange = (event) => {
        const {value} = event.currentTarget;
        setSearch(value);
        setSortedData(sortData(data, {sortBy, reversed: reverseSortDirection, search: value}));
    };
    const rows = currentPageData.map((row) => (
        <tr key={row.name}>
            <td>{row.id}</td>
            <td>
                {
                    row.img ?
                        <AspectRatio ratio={1 / 1} mah={40} mx="auto">
                            <Image
                                className={classes.image}
                                fit="contain"
                                placeholder={
                                    <Text align="center">Not available</Text>
                                }
                                src={row.img}
                                withPlaceholder
                            />
                        </AspectRatio>
                        :
                        <Loader/>
                }
            </td>
            <td>{row.name}</td>
            <td>{row.limit}</td>
            <td>{row.low}</td>
            <td>{row.high}</td>
            <td>{row.profit}</td>
        </tr>
    ));


    return (
        <ScrollArea h={800} onScrollPositionChange={({y}) => setScrolled(y !== 0)}>
            <TextInput
                placeholder="Search by any field"
                mb="md"
                icon={<IconSearch size="0.9rem" stroke={1.5}/>}
                value={search}
                onChange={handleSearchChange}
            />
            <Table horizontalSpacing="md" verticalSpacing="xs" miw={700} sx={{tableLayout: 'fixed'}}>
                <thead className={cx(classes.header, {[classes.scrolled]: scrolled})}>
                <tr>
                    <Th
                        sorted={sortBy === 'id'}
                        reversed={reverseSortDirection}
                        onSort={() => setSorting('id')}
                    >
                        Id
                    </Th>
                    <Th
                        sorted={sortBy === 'img'}
                        reversed={reverseSortDirection}
                        onSort={() => setSorting('img')}
                    >
                        Img
                    </Th>
                    <Th
                        sorted={sortBy === 'name'}
                        reversed={reverseSortDirection}
                        onSort={() => setSorting('name')}
                    >
                        Name
                    </Th>
                    <Th
                        sorted={sortBy === 'limit'}
                        reversed={reverseSortDirection}
                        onSort={() => setSorting('limit')}
                    >
                        Buy Limit
                    </Th>
                    <Th
                        sorted={sortBy === 'buyPrice'}
                        reversed={reverseSortDirection}
                        onSort={() => setSorting('buyPrice')}
                    >
                        Buy Price
                    </Th>
                    <Th
                        sorted={sortBy === 'sellPrice'}
                        reversed={reverseSortDirection}
                        onSort={() => setSorting('sellPrice')}
                    >
                        Sell Price
                    </Th>
                    <Th
                        sorted={sortBy === 'profit'}
                        reversed={reverseSortDirection}
                        onSort={() => setSorting('profit')}
                    >
                        Profit
                    </Th>
                </tr>
                </thead>
                <tbody>
                {rows.length > 0 ? (
                    rows
                ) : (
                    <tr>
                        <td colSpan={data.length && Object.keys(data[0]).length}>
                            <Text weight={500} align="center">
                                Nothing found
                            </Text>
                        </td>
                    </tr>
                )}
                </tbody>
            </Table>
            <Pagination
                total={Math.ceil(sortedData.length / itemsPerPage)}
                value={currentPage}
                onChange={setCurrentPage}
                gutter="md"
                mt="md"
                mb="md"
            />
        </ScrollArea>
    );
}

export default TableSort