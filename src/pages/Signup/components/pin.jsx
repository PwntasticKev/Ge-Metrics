import React from 'react';
import {TextInput, Text} from '@mantine/core';

function PinInput({label, error, ...rest}) {
    return (
        <div>
            <TextInput label={label} error={error} {...rest} />
            {error && <Text color="red">{error}</Text>}
        </div>
    );
}

export default PinInput;