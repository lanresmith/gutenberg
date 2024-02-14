/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import {
	BlockSettingsMenuControls,
	useBlockProps,
	Warning,
	store as blockEditorStore,
	useInnerBlocksProps,
	useSettings,
	RecursionProvider,
	useHasRecursion,
	InspectorControls,
} from '@wordpress/block-editor';
import { Spinner, Modal, MenuItem } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { store as coreStore, useEntityBlockEditor } from '@wordpress/core-data';
import { useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import TemplatePartPlaceholder from './placeholder';
import TemplatePartSelectionModal from './selection-modal';
import { TemplatePartAdvancedControls } from './advanced-controls';
import TemplatePartInnerBlocks from './inner-blocks';
import { createTemplatePartId } from './utils/create-template-part-id';
import {
	useAlternativeBlockPatterns,
	useAlternativeTemplateParts,
	useTemplatePartArea,
} from './utils/hooks';

function ReplaceButton( {
	isEntityAvailable,
	area,
	clientId,
	templatePartId,
	isTemplatePartSelectionOpen,
	setIsTemplatePartSelectionOpen,
} ) {
	const { templateParts } = useAlternativeTemplateParts(
		area,
		templatePartId
	);
	const blockPatterns = useAlternativeBlockPatterns( area, clientId );

	const hasReplacements = !! templateParts.length || !! blockPatterns.length;
	const canReplace =
		isEntityAvailable &&
		hasReplacements &&
		( area === 'header' || area === 'footer' );

	if ( ! canReplace ) {
		return null;
	}

	return (
		<MenuItem
			onClick={ () => {
				setIsTemplatePartSelectionOpen( true );
			} }
			aria-expanded={ isTemplatePartSelectionOpen }
			aria-haspopup="dialog"
		>
			{ __( 'Replace' ) }
		</MenuItem>
	);
}

function NonEditableTemplatePartPreview( {
	postId: id,
	layout,
	tagName: TagName,
	blockProps,
} ) {
	const themeSupportsLayout = useSelect( ( select ) => {
		const { getSettings } = select( blockEditorStore );
		return getSettings()?.supportsLayout;
	}, [] );
	const [ defaultLayout ] = useSettings( 'layout' );
	const usedLayout = layout?.inherit ? defaultLayout || {} : layout;

	const [ blocks ] = useEntityBlockEditor( 'postType', 'wp_template_part', {
		id,
		context: 'view',
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		value: blocks,
		onChange: () => {},
		onInput: () => {},
		renderAppender: undefined,
		layout: themeSupportsLayout ? usedLayout : undefined,
	} );

	return <TagName { ...innerBlocksProps } />;
}

export default function TemplatePartEdit( {
	attributes,
	setAttributes,
	clientId,
} ) {
	const { canEditTemplatePart, canViewTemplatePart } = useSelect(
		( select ) => ( {
			canEditTemplatePart:
				select( coreStore ).canUser( 'create', 'template-parts' ) ??
				false,
			canViewTemplatePart:
				select( coreStore ).canUser( 'read', 'template-parts' ) ??
				false,
		} ),
		[]
	);

	const currentTheme = useSelect(
		( select ) => select( coreStore ).getCurrentTheme()?.stylesheet,
		[]
	);
	const { slug, theme = currentTheme, tagName, layout = {} } = attributes;
	const templatePartId = createTemplatePartId( theme, slug );
	const hasAlreadyRendered = useHasRecursion( templatePartId );
	const [ isTemplatePartSelectionOpen, setIsTemplatePartSelectionOpen ] =
		useState( false );

	const { isResolved, hasInnerBlocks, isMissing, area } = useSelect(
		( select ) => {
			const { getEditedEntityRecord, hasFinishedResolution } =
				select( coreStore );
			const { getBlockCount } = select( blockEditorStore );

			const getEntityArgs = [
				'postType',
				'wp_template_part',
				templatePartId,
			];
			const entityRecord = templatePartId
				? getEditedEntityRecord( ...getEntityArgs )
				: null;
			const _area = entityRecord?.area || attributes.area;
			const hasResolvedEntity = templatePartId
				? hasFinishedResolution(
						'getEditedEntityRecord',
						getEntityArgs
				  )
				: false;

			return {
				hasInnerBlocks: getBlockCount( clientId ) > 0,
				isResolved: hasResolvedEntity,
				isMissing:
					hasResolvedEntity &&
					( ! entityRecord ||
						Object.keys( entityRecord ).length === 0 ),
				area: _area,
			};
		},
		[ templatePartId, attributes.area, clientId ]
	);

	const areaObject = useTemplatePartArea( area );
	const blockProps = useBlockProps();
	const isPlaceholder = ! slug;
	const isEntityAvailable = ! isPlaceholder && ! isMissing && isResolved;
	const TagName = tagName || areaObject.tagName;

	if ( ! canEditTemplatePart && canViewTemplatePart ) {
		return (
			<RecursionProvider uniqueId={ templatePartId }>
				<NonEditableTemplatePartPreview
					attributes={ attributes }
					setAttributes={ setAttributes }
					clientId={ clientId }
					tagName={ TagName }
					blockProps={ blockProps }
					postId={ templatePartId }
					hasInnerBlocks={ hasInnerBlocks }
					layout={ layout }
				/>
			</RecursionProvider>
		);
	}

	// We don't want to render a missing state if we have any inner blocks.
	// A new template part is automatically created if we have any inner blocks but no entity.
	if (
		! hasInnerBlocks &&
		( ( slug && ! theme ) || ( slug && isMissing ) )
	) {
		return (
			<TagName { ...blockProps }>
				<Warning>
					{ sprintf(
						/* translators: %s: Template part slug */
						__(
							'Template part has been deleted or is unavailable: %s'
						),
						slug
					) }
				</Warning>
			</TagName>
		);
	}

	if ( isEntityAvailable && hasAlreadyRendered ) {
		return (
			<TagName { ...blockProps }>
				<Warning>
					{ __( 'Block cannot be rendered inside itself.' ) }
				</Warning>
			</TagName>
		);
	}

	return (
		<>
			<RecursionProvider uniqueId={ templatePartId }>
				<InspectorControls group="advanced">
					<TemplatePartAdvancedControls
						tagName={ tagName }
						setAttributes={ setAttributes }
						isEntityAvailable={ isEntityAvailable }
						templatePartId={ templatePartId }
						defaultWrapper={ areaObject.tagName }
						hasInnerBlocks={ hasInnerBlocks }
					/>
				</InspectorControls>
				{ isPlaceholder && (
					<TagName { ...blockProps }>
						<TemplatePartPlaceholder
							area={ attributes.area }
							templatePartId={ templatePartId }
							clientId={ clientId }
							setAttributes={ setAttributes }
							onOpenSelectionModal={ () =>
								setIsTemplatePartSelectionOpen( true )
							}
						/>
					</TagName>
				) }
				<BlockSettingsMenuControls>
					{ ( { selectedClientIds } ) => {
						// Only enable for single selection that matches the current block.
						// Ensures menu item doesn't render multiple times.
						if (
							! (
								selectedClientIds.length === 1 &&
								clientId === selectedClientIds[ 0 ]
							)
						) {
							return null;
						}

						return (
							<ReplaceButton
								{ ...{
									isEntityAvailable,
									area,
									clientId,
									templatePartId,
									isTemplatePartSelectionOpen,
									setIsTemplatePartSelectionOpen,
								} }
							/>
						);
					} }
				</BlockSettingsMenuControls>
				{ isEntityAvailable && (
					<TemplatePartInnerBlocks
						tagName={ TagName }
						blockProps={ blockProps }
						postId={ templatePartId }
						hasInnerBlocks={ hasInnerBlocks }
						layout={ layout }
					/>
				) }
				{ ! isPlaceholder && ! isResolved && (
					<TagName { ...blockProps }>
						<Spinner />
					</TagName>
				) }
			</RecursionProvider>
			{ isTemplatePartSelectionOpen && (
				<Modal
					overlayClassName="block-editor-template-part__selection-modal"
					title={ sprintf(
						// Translators: %s as template part area title ("Header", "Footer", etc.).
						__( 'Choose a %s' ),
						areaObject.label.toLowerCase()
					) }
					onRequestClose={ () =>
						setIsTemplatePartSelectionOpen( false )
					}
					isFullScreen={ true }
				>
					<TemplatePartSelectionModal
						templatePartId={ templatePartId }
						clientId={ clientId }
						area={ area }
						setAttributes={ setAttributes }
						onClose={ () =>
							setIsTemplatePartSelectionOpen( false )
						}
					/>
				</Modal>
			) }
		</>
	);
}
