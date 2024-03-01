/**
 * WordPress dependencies
 */
import {
	__unstableMotion as motion,
	__experimentalHStack as HStack,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import PreviewHighlightedColors from './preview-highlighted-colors';
import PreviewWrapper from './preview-wrapper';

const StylesPreviewColors = ( { label, isFocused, withHoverView } ) => {
	return (
		<PreviewWrapper
			label={ label }
			isFocused={ isFocused }
			withHoverView={ withHoverView }
		>
			{ ( { firstFrame, ratio } ) => (
				<motion.div
					variants={ firstFrame }
					style={ {
						height: '100%',
						overflow: 'hidden',
					} }
				>
					<HStack
						spacing={ 10 * ratio }
						justify="center"
						style={ {
							height: '100%',
							overflow: 'hidden',
						} }
					>
						<PreviewHighlightedColors
							normalizedColorSwatchSize={ 66 }
							ratio={ ratio }
						/>
					</HStack>
				</motion.div>
			) }
		</PreviewWrapper>
	);
};

export default StylesPreviewColors;
