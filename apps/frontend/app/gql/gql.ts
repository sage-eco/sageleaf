/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  fragment VariantRecycleStreams on VariantComponentsConnection {\n    nodes {\n      component {\n        id\n        name\n        desc\n        imageURL\n        primaryMaterial {\n          id\n          name\n        }\n        recycleScore {\n          score\n          rating\n          ratingF\n        }\n        recycle {\n          context {\n            key\n            markdown\n          }\n          stream {\n            name\n            desc\n            score {\n              score\n              rating\n              ratingF\n            }\n            container {\n              type\n              access\n              shape {\n                width\n                height\n                depth\n              }\n              color\n              image\n              imageEntryPoint {\n                x\n                y\n                side\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.VariantRecycleStreamsFragmentDoc,
    "\n  mutation FeedbackVoteMissingData($input: VoteInput!) {\n    vote(input: $input) {\n      success\n    }\n  }\n": typeof types.FeedbackVoteMissingDataDocument,
    "\n  mutation FeedbackVote($input: VoteInput!) {\n    vote(input: $input) {\n      success\n    }\n  }\n": typeof types.FeedbackVoteDocument,
    "\n  fragment ItemRecycleStreams on ItemRecycle {\n    stream {\n      name\n      desc\n      score {\n        score\n        rating\n        ratingF\n      }\n      container {\n        type\n        access\n        shape {\n          width\n          height\n          depth\n        }\n        color\n        image\n        imageEntryPoint {\n          x\n          y\n          side\n        }\n      }\n    }\n    context {\n      key\n      markdown\n    }\n  }\n": typeof types.ItemRecycleStreamsFragmentDoc,
    "\n  query RegionSelectQuery($id: ID!) {\n    region(id: $id) {\n      id\n      name\n      desc\n      placetype\n      bbox\n      minZoom\n    }\n  }\n": typeof types.RegionSelectQueryDocument,
    "\n  query RegionSelectCurrentRegion {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n        placetype\n        bbox\n        minZoom\n      }\n    }\n  }\n": typeof types.RegionSelectCurrentRegionDocument,
    "\n  query RegionSelectSearch($query: String!) {\n    search(query: $query, types: [REGION]) {\n      nodes {\n        __typename\n        ... on Region {\n          id\n          name\n          desc\n          placetype\n        }\n      }\n      totalCount\n    }\n  }\n": typeof types.RegionSelectSearchDocument,
    "\n  query ChangesCategorySchema {\n    categorySchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n": typeof types.ChangesCategorySchemaDocument,
    "\n  query ChangesCategoryEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n": typeof types.ChangesCategoryEditDocument,
    "\n  mutation ChangeCategoryCreate($input: CreateCategoryInput!) {\n    createCategory(input: $input) {\n      change {\n        id\n      }\n      category {\n        id\n      }\n    }\n  }\n": typeof types.ChangeCategoryCreateDocument,
    "\n  mutation ChangeCategoryUpdate($input: UpdateCategoryInput!) {\n    updateCategory(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n": typeof types.ChangeCategoryUpdateDocument,
    "\n  query ChangesComponentSchema {\n    componentSchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n": typeof types.ChangesComponentSchemaDocument,
    "\n  query ChangesComponentEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n": typeof types.ChangesComponentEditDocument,
    "\n  mutation ChangeComponentCreate($input: CreateComponentInput!) {\n    createComponent(input: $input) {\n      change {\n        id\n      }\n      component {\n        id\n      }\n    }\n  }\n": typeof types.ChangeComponentCreateDocument,
    "\n  mutation ChangeComponentUpdate($input: UpdateComponentInput!) {\n    updateComponent(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n": typeof types.ChangeComponentUpdateDocument,
    "\n  query ChangeQuery($id: ID!) {\n    change(id: $id) {\n      id\n      status\n      title\n      description\n      createdAt\n      updatedAt\n      user {\n        id\n        username\n      }\n      edits {\n        nodes {\n          id\n          entityName\n          original {\n            ... on Variant {\n              name\n            }\n            ... on Component {\n              name\n            }\n            ... on Category {\n              name_req: name\n            }\n            ... on Place {\n              name\n            }\n            ... on Item {\n              name\n            }\n            ... on Process {\n              name\n            }\n          }\n          changes {\n            ... on Variant {\n              name\n            }\n            ... on Component {\n              name\n            }\n            ... on Category {\n              name_req: name\n            }\n            ... on Place {\n              name\n            }\n            ... on Item {\n              name\n            }\n            ... on Process {\n              name\n            }\n          }\n        }\n        totalCount\n      }\n    }\n  }\n": typeof types.ChangeQueryDocument,
    "\n  mutation ChangeEditMutation($input: UpdateChangeInput!) {\n    updateChange(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n": typeof types.ChangeEditMutationDocument,
    "\n  mutation ChangeDeleteMutation($id: ID!) {\n    deleteChange(id: $id) {\n      success\n    }\n  }\n": typeof types.ChangeDeleteMutationDocument,
    "\n  mutation ChangeMergeMutation($id: ID!) {\n    mergeChange(id: $id) {\n      change {\n        id\n      }\n    }\n  }\n": typeof types.ChangeMergeMutationDocument,
    "\n  query ChangesProcessSchema {\n    processSchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n": typeof types.ChangesProcessSchemaDocument,
    "\n  query ChangesProcessEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n": typeof types.ChangesProcessEditDocument,
    "\n  mutation ChangeProcessCreate($input: CreateProcessInput!) {\n    createProcess(input: $input) {\n      change {\n        id\n      }\n      process {\n        id\n      }\n    }\n  }\n": typeof types.ChangeProcessCreateDocument,
    "\n  mutation ChangeProcessUpdate($input: UpdateProcessInput!) {\n    updateProcess(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n": typeof types.ChangeProcessUpdateDocument,
    "\n  query ChangesIndexGetChanges($first: Int) {\n    changes(first: $first) {\n      nodes {\n        id\n        status\n        title\n        description\n        createdAt\n        updatedAt\n        edits {\n          totalCount\n        }\n      }\n    }\n  }\n": typeof types.ChangesIndexGetChangesDocument,
    "\n  query ContributeProjectFeed($format: FeedFormat) {\n    feed(format: $format) {\n      nodes {\n        id\n        format\n        title\n        markdownShort\n        link {\n          entityName\n          id\n        }\n        externalLink {\n          url\n        }\n      }\n    }\n  }\n": typeof types.ContributeProjectFeedDocument,
    "\n  query ContributeMeChanges {\n    me {\n      id\n      changes {\n        nodes {\n          id\n          status\n          title\n          description\n        }\n      }\n    }\n  }\n": typeof types.ContributeMeChangesDocument,
    "\n  mutation UpdateCategoryNewChange($input: UpdateCategoryInput!) {\n    updateCategory(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n": typeof types.UpdateCategoryNewChangeDocument,
    "\n  query CategoriesIDGetCategories($id: ID!) {\n    category(id: $id) {\n      id\n      name\n      descShort\n      desc\n      imageURL\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n": typeof types.CategoriesIdGetCategoriesDocument,
    "\n  query CategoriesIndexGetCategories {\n    categoryRoot {\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n": typeof types.CategoriesIndexGetCategoriesDocument,
    "\n  query ExploreGetItems($first: Int!) {\n    items(first: $first) {\n      nodes {\n        id\n        name\n        imageURL\n      }\n    }\n  }\n": typeof types.ExploreGetItemsDocument,
    "\n  query ExploreGetPrograms($first: Int!) {\n    programs(first: $first) {\n      nodes {\n        id\n        name\n        desc\n        region {\n          name\n        }\n      }\n    }\n  }\n": typeof types.ExploreGetProgramsDocument,
    "\n  query GetCategories {\n    categoryRoot {\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n": typeof types.GetCategoriesDocument,
    "\n  query GetItem($id: ID!) {\n    item(id: $id) {\n      id\n      name\n      desc\n      imageURL\n    }\n  }\n": typeof types.GetItemDocument,
    "\n  query GetItemRecycling($id: ID!) {\n    item(id: $id) {\n      id\n      recycleScore {\n        score\n        rating\n        ratingF\n      }\n      recycle {\n        ...ItemRecycleStreams\n      }\n    }\n  }\n": typeof types.GetItemRecyclingDocument,
    "\n  query GetItemVariants($id: ID!) {\n    item(id: $id) {\n      id\n      variants {\n        nodes {\n          id\n          name\n          imageURL\n          recycleScore {\n            score\n            rating\n            ratingF\n          }\n          orgs {\n            nodes {\n              org {\n                name\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetItemVariantsDocument,
    "\n  query ItemsIndexGetItems($first: Int!, $after: String) {\n    items(first: $first, after: $after) {\n      nodes {\n        id\n        name\n        imageURL\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.ItemsIndexGetItemsDocument,
    "\n  query GetOrg($id: ID!) {\n    org(id: $id) {\n      id\n      name\n      desc\n    }\n  }\n": typeof types.GetOrgDocument,
    "\n  query GetPlace($id: ID!) {\n    place(id: $id) {\n      id\n      name\n      desc\n      address {\n        housenumber\n        street\n        city\n        region\n        postcode\n        country\n      }\n      location {\n        latitude\n        longitude\n      }\n      tags(first: 20) {\n        nodes {\n          id\n          name\n          image\n          bgColor\n        }\n      }\n      org {\n        id\n        name\n        desc\n        avatarURL\n        slug\n      }\n    }\n  }\n": typeof types.GetPlaceDocument,
    "\n  query GetPlaceRelated($id: ID!) {\n    place(id: $id) {\n      id\n      related(limit: 10) {\n        nodes {\n          id\n          name\n          address {\n            city\n            region\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetPlaceRelatedDocument,
    "\n  query PlacesIndexRegionQuery($id: ID!) {\n    region(id: $id) {\n      id\n      name\n      placetype\n      bbox\n      minZoom\n    }\n  }\n": typeof types.PlacesIndexRegionQueryDocument,
    "\n  query PlaceSearch($search: String!, $latLong: [Float!]) {\n    search(query: $search, types: [PLACE], latlong: $latLong, limit: 100) {\n      nodes {\n        ... on Place {\n          id\n          name\n          address {\n            city\n          }\n          location {\n            latitude\n            longitude\n          }\n        }\n      }\n      totalCount\n    }\n  }\n": typeof types.PlaceSearchDocument,
    "\n  query ProgramsIndexGetPrograms($first: Int!, $after: String) {\n    programs(first: $first, after: $after) {\n      nodes {\n        id\n        name\n        desc\n        region {\n          name\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.ProgramsIndexGetProgramsDocument,
    "\n  query GetVariant($id: ID!) {\n    variant(id: $id) {\n      id\n      name\n      desc\n      imageURL\n      images {\n        nodes {\n          url\n        }\n      }\n      orgs {\n        nodes {\n          org {\n            id\n            name\n            desc\n            avatarURL\n          }\n        }\n      }\n      components {\n        nodes {\n          component {\n            id\n            name\n            desc\n            imageURL\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetVariantDocument,
    "\n  query GetVariantRecycling($id: ID!) {\n    variant(id: $id) {\n      id\n      name\n      recycleScore {\n        score\n        rating\n        ratingF\n      }\n      components {\n        ...VariantRecycleStreams\n      }\n    }\n  }\n": typeof types.GetVariantRecyclingDocument,
    "\n  query HomeFeed($region: ID) {\n    feed(region: $region) {\n      nodes {\n        id\n        format\n        title\n        category\n        markdownShort\n        link {\n          entityName\n          id\n        }\n        externalLink {\n          url\n        }\n      }\n    }\n  }\n": typeof types.HomeFeedDocument,
    "\n  query CurrentRegionHome {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n      }\n    }\n  }\n": typeof types.CurrentRegionHomeDocument,
    "\n  query CurrentRegionProfile {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n      }\n    }\n  }\n": typeof types.CurrentRegionProfileDocument,
    "\n  query Search($query: String!) {\n    search(query: $query) {\n      nodes {\n        __typename\n        ... on Category {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n        ... on Item {\n          id\n          name_null: name\n          desc\n          imageURL\n        }\n        ... on Variant {\n          id\n          name_null: name\n          desc\n          imageURL\n          orgs(first: 3) {\n            nodes {\n              org {\n                name\n              }\n            }\n          }\n        }\n        ... on Place {\n          id\n          name_null: name\n          address {\n            street\n            city\n            region\n            country\n          }\n        }\n        ... on Org {\n          id\n          name\n          desc\n        }\n      }\n      totalCount\n    }\n  }\n": typeof types.SearchDocument,
    "\n  query ScanSearchQuery($query: String!) {\n    search(query: $query, types: [VARIANT, ITEM]) {\n      nodes {\n        __typename\n        ... on Variant {\n          id\n          name\n          desc\n          imageURL\n        }\n        ... on Item {\n          id\n          name\n          desc\n          imageURL\n        }\n      }\n      totalCount\n    }\n  }\n": typeof types.ScanSearchQueryDocument,
    "\n  query ChangesGetEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n": typeof types.ChangesGetEditDocument,
    "\n  query DirectGetEdit($id: ID!, $entityName: String!) {\n    directEdit(id: $id, entityName: $entityName) {\n      entityName\n      id\n      updateInput\n    }\n  }\n": typeof types.DirectGetEditDocument,
    "\n    query RefCategoryQuery($id: ID!) {\n      category(id: $id) {\n        ...ListCategoryFragment\n      }\n    }\n  ": typeof types.RefCategoryQueryDocument,
    "\n    query RefItemQuery($id: ID!) {\n      item(id: $id) {\n        ...ListItemFragment\n      }\n    }\n  ": typeof types.RefItemQueryDocument,
    "\n    query RefVariantQuery($id: ID!) {\n      variant(id: $id) {\n        ...ListVariantFragment\n      }\n    }\n  ": typeof types.RefVariantQueryDocument,
    "\n    query RefComponentQuery($id: ID!) {\n      component(id: $id) {\n        ...ListComponentFragment\n      }\n    }\n  ": typeof types.RefComponentQueryDocument,
    "\n    query RefOrgQuery($id: ID!) {\n      org(id: $id) {\n        ...ListOrgFragment\n      }\n    }\n  ": typeof types.RefOrgQueryDocument,
    "\n    query RefRegionQuery($id: ID!) {\n      region(id: $id) {\n        ...ListRegionFragment\n      }\n    }\n  ": typeof types.RefRegionQueryDocument,
    "\n    query RefPlaceQuery($id: ID!) {\n      place(id: $id) {\n        ...ListPlaceFragment\n      }\n    }\n  ": typeof types.RefPlaceQueryDocument,
    "\n    query RefMaterialQuery($id: ID!) {\n      material(id: $id) {\n        ...ListMaterialFragment\n      }\n    }\n  ": typeof types.RefMaterialQueryDocument,
    "\n  fragment ListCategoryFragment on Category {\n    id\n    name_req: name\n    descShort\n    imageURL\n  }\n": typeof types.ListCategoryFragmentFragmentDoc,
    "\n  fragment ListChangeFragment on Change {\n    id\n    title\n    description\n    status\n  }\n": typeof types.ListChangeFragmentFragmentDoc,
    "\n  fragment ListComponentFragment on Component {\n    id\n    name\n    desc\n    imageURL\n  }\n": typeof types.ListComponentFragmentFragmentDoc,
    "\n  fragment ListItemFragment on Item {\n    id\n    name\n    desc\n    imageURL\n  }\n": typeof types.ListItemFragmentFragmentDoc,
    "\n  fragment ListMaterialFragment on Material {\n    id\n    name\n    desc\n    shape\n  }\n": typeof types.ListMaterialFragmentFragmentDoc,
    "\n  fragment ListOrgFragment on Org {\n    id\n    name_req: name\n    desc\n    avatarURL\n  }\n": typeof types.ListOrgFragmentFragmentDoc,
    "\n  fragment ListPlaceFragment on Place {\n    id\n    name\n    desc\n  }\n": typeof types.ListPlaceFragmentFragmentDoc,
    "\n  fragment ListProcessFragment on Process {\n    id\n    name\n    desc\n  }\n": typeof types.ListProcessFragmentFragmentDoc,
    "\n  fragment ListRegionFragment on Region {\n    id\n    name\n  }\n": typeof types.ListRegionFragmentFragmentDoc,
    "\n  fragment ListVariantFragment on Variant {\n    id\n    name\n    desc\n    imageURL\n  }\n": typeof types.ListVariantFragmentFragmentDoc,
    "\n      query RefSearchQuery($input: String!, $type: SearchType!) {\n        search(query: $input, types: [$type]) {\n          totalCount\n          nodes {\n            ...ListCategoryFragment\n            ...ListItemFragment\n            ...ListVariantFragment\n            ...ListComponentFragment\n            ...ListOrgFragment\n            ...ListRegionFragment\n            ...ListPlaceFragment\n            ...ListMaterialFragment\n          }\n        }\n      }\n    ": typeof types.RefSearchQueryDocument,
};
const documents: Documents = {
    "\n  fragment VariantRecycleStreams on VariantComponentsConnection {\n    nodes {\n      component {\n        id\n        name\n        desc\n        imageURL\n        primaryMaterial {\n          id\n          name\n        }\n        recycleScore {\n          score\n          rating\n          ratingF\n        }\n        recycle {\n          context {\n            key\n            markdown\n          }\n          stream {\n            name\n            desc\n            score {\n              score\n              rating\n              ratingF\n            }\n            container {\n              type\n              access\n              shape {\n                width\n                height\n                depth\n              }\n              color\n              image\n              imageEntryPoint {\n                x\n                y\n                side\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": types.VariantRecycleStreamsFragmentDoc,
    "\n  mutation FeedbackVoteMissingData($input: VoteInput!) {\n    vote(input: $input) {\n      success\n    }\n  }\n": types.FeedbackVoteMissingDataDocument,
    "\n  mutation FeedbackVote($input: VoteInput!) {\n    vote(input: $input) {\n      success\n    }\n  }\n": types.FeedbackVoteDocument,
    "\n  fragment ItemRecycleStreams on ItemRecycle {\n    stream {\n      name\n      desc\n      score {\n        score\n        rating\n        ratingF\n      }\n      container {\n        type\n        access\n        shape {\n          width\n          height\n          depth\n        }\n        color\n        image\n        imageEntryPoint {\n          x\n          y\n          side\n        }\n      }\n    }\n    context {\n      key\n      markdown\n    }\n  }\n": types.ItemRecycleStreamsFragmentDoc,
    "\n  query RegionSelectQuery($id: ID!) {\n    region(id: $id) {\n      id\n      name\n      desc\n      placetype\n      bbox\n      minZoom\n    }\n  }\n": types.RegionSelectQueryDocument,
    "\n  query RegionSelectCurrentRegion {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n        placetype\n        bbox\n        minZoom\n      }\n    }\n  }\n": types.RegionSelectCurrentRegionDocument,
    "\n  query RegionSelectSearch($query: String!) {\n    search(query: $query, types: [REGION]) {\n      nodes {\n        __typename\n        ... on Region {\n          id\n          name\n          desc\n          placetype\n        }\n      }\n      totalCount\n    }\n  }\n": types.RegionSelectSearchDocument,
    "\n  query ChangesCategorySchema {\n    categorySchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n": types.ChangesCategorySchemaDocument,
    "\n  query ChangesCategoryEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n": types.ChangesCategoryEditDocument,
    "\n  mutation ChangeCategoryCreate($input: CreateCategoryInput!) {\n    createCategory(input: $input) {\n      change {\n        id\n      }\n      category {\n        id\n      }\n    }\n  }\n": types.ChangeCategoryCreateDocument,
    "\n  mutation ChangeCategoryUpdate($input: UpdateCategoryInput!) {\n    updateCategory(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n": types.ChangeCategoryUpdateDocument,
    "\n  query ChangesComponentSchema {\n    componentSchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n": types.ChangesComponentSchemaDocument,
    "\n  query ChangesComponentEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n": types.ChangesComponentEditDocument,
    "\n  mutation ChangeComponentCreate($input: CreateComponentInput!) {\n    createComponent(input: $input) {\n      change {\n        id\n      }\n      component {\n        id\n      }\n    }\n  }\n": types.ChangeComponentCreateDocument,
    "\n  mutation ChangeComponentUpdate($input: UpdateComponentInput!) {\n    updateComponent(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n": types.ChangeComponentUpdateDocument,
    "\n  query ChangeQuery($id: ID!) {\n    change(id: $id) {\n      id\n      status\n      title\n      description\n      createdAt\n      updatedAt\n      user {\n        id\n        username\n      }\n      edits {\n        nodes {\n          id\n          entityName\n          original {\n            ... on Variant {\n              name\n            }\n            ... on Component {\n              name\n            }\n            ... on Category {\n              name_req: name\n            }\n            ... on Place {\n              name\n            }\n            ... on Item {\n              name\n            }\n            ... on Process {\n              name\n            }\n          }\n          changes {\n            ... on Variant {\n              name\n            }\n            ... on Component {\n              name\n            }\n            ... on Category {\n              name_req: name\n            }\n            ... on Place {\n              name\n            }\n            ... on Item {\n              name\n            }\n            ... on Process {\n              name\n            }\n          }\n        }\n        totalCount\n      }\n    }\n  }\n": types.ChangeQueryDocument,
    "\n  mutation ChangeEditMutation($input: UpdateChangeInput!) {\n    updateChange(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n": types.ChangeEditMutationDocument,
    "\n  mutation ChangeDeleteMutation($id: ID!) {\n    deleteChange(id: $id) {\n      success\n    }\n  }\n": types.ChangeDeleteMutationDocument,
    "\n  mutation ChangeMergeMutation($id: ID!) {\n    mergeChange(id: $id) {\n      change {\n        id\n      }\n    }\n  }\n": types.ChangeMergeMutationDocument,
    "\n  query ChangesProcessSchema {\n    processSchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n": types.ChangesProcessSchemaDocument,
    "\n  query ChangesProcessEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n": types.ChangesProcessEditDocument,
    "\n  mutation ChangeProcessCreate($input: CreateProcessInput!) {\n    createProcess(input: $input) {\n      change {\n        id\n      }\n      process {\n        id\n      }\n    }\n  }\n": types.ChangeProcessCreateDocument,
    "\n  mutation ChangeProcessUpdate($input: UpdateProcessInput!) {\n    updateProcess(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n": types.ChangeProcessUpdateDocument,
    "\n  query ChangesIndexGetChanges($first: Int) {\n    changes(first: $first) {\n      nodes {\n        id\n        status\n        title\n        description\n        createdAt\n        updatedAt\n        edits {\n          totalCount\n        }\n      }\n    }\n  }\n": types.ChangesIndexGetChangesDocument,
    "\n  query ContributeProjectFeed($format: FeedFormat) {\n    feed(format: $format) {\n      nodes {\n        id\n        format\n        title\n        markdownShort\n        link {\n          entityName\n          id\n        }\n        externalLink {\n          url\n        }\n      }\n    }\n  }\n": types.ContributeProjectFeedDocument,
    "\n  query ContributeMeChanges {\n    me {\n      id\n      changes {\n        nodes {\n          id\n          status\n          title\n          description\n        }\n      }\n    }\n  }\n": types.ContributeMeChangesDocument,
    "\n  mutation UpdateCategoryNewChange($input: UpdateCategoryInput!) {\n    updateCategory(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n": types.UpdateCategoryNewChangeDocument,
    "\n  query CategoriesIDGetCategories($id: ID!) {\n    category(id: $id) {\n      id\n      name\n      descShort\n      desc\n      imageURL\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n": types.CategoriesIdGetCategoriesDocument,
    "\n  query CategoriesIndexGetCategories {\n    categoryRoot {\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n": types.CategoriesIndexGetCategoriesDocument,
    "\n  query ExploreGetItems($first: Int!) {\n    items(first: $first) {\n      nodes {\n        id\n        name\n        imageURL\n      }\n    }\n  }\n": types.ExploreGetItemsDocument,
    "\n  query ExploreGetPrograms($first: Int!) {\n    programs(first: $first) {\n      nodes {\n        id\n        name\n        desc\n        region {\n          name\n        }\n      }\n    }\n  }\n": types.ExploreGetProgramsDocument,
    "\n  query GetCategories {\n    categoryRoot {\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n": types.GetCategoriesDocument,
    "\n  query GetItem($id: ID!) {\n    item(id: $id) {\n      id\n      name\n      desc\n      imageURL\n    }\n  }\n": types.GetItemDocument,
    "\n  query GetItemRecycling($id: ID!) {\n    item(id: $id) {\n      id\n      recycleScore {\n        score\n        rating\n        ratingF\n      }\n      recycle {\n        ...ItemRecycleStreams\n      }\n    }\n  }\n": types.GetItemRecyclingDocument,
    "\n  query GetItemVariants($id: ID!) {\n    item(id: $id) {\n      id\n      variants {\n        nodes {\n          id\n          name\n          imageURL\n          recycleScore {\n            score\n            rating\n            ratingF\n          }\n          orgs {\n            nodes {\n              org {\n                name\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": types.GetItemVariantsDocument,
    "\n  query ItemsIndexGetItems($first: Int!, $after: String) {\n    items(first: $first, after: $after) {\n      nodes {\n        id\n        name\n        imageURL\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.ItemsIndexGetItemsDocument,
    "\n  query GetOrg($id: ID!) {\n    org(id: $id) {\n      id\n      name\n      desc\n    }\n  }\n": types.GetOrgDocument,
    "\n  query GetPlace($id: ID!) {\n    place(id: $id) {\n      id\n      name\n      desc\n      address {\n        housenumber\n        street\n        city\n        region\n        postcode\n        country\n      }\n      location {\n        latitude\n        longitude\n      }\n      tags(first: 20) {\n        nodes {\n          id\n          name\n          image\n          bgColor\n        }\n      }\n      org {\n        id\n        name\n        desc\n        avatarURL\n        slug\n      }\n    }\n  }\n": types.GetPlaceDocument,
    "\n  query GetPlaceRelated($id: ID!) {\n    place(id: $id) {\n      id\n      related(limit: 10) {\n        nodes {\n          id\n          name\n          address {\n            city\n            region\n          }\n        }\n      }\n    }\n  }\n": types.GetPlaceRelatedDocument,
    "\n  query PlacesIndexRegionQuery($id: ID!) {\n    region(id: $id) {\n      id\n      name\n      placetype\n      bbox\n      minZoom\n    }\n  }\n": types.PlacesIndexRegionQueryDocument,
    "\n  query PlaceSearch($search: String!, $latLong: [Float!]) {\n    search(query: $search, types: [PLACE], latlong: $latLong, limit: 100) {\n      nodes {\n        ... on Place {\n          id\n          name\n          address {\n            city\n          }\n          location {\n            latitude\n            longitude\n          }\n        }\n      }\n      totalCount\n    }\n  }\n": types.PlaceSearchDocument,
    "\n  query ProgramsIndexGetPrograms($first: Int!, $after: String) {\n    programs(first: $first, after: $after) {\n      nodes {\n        id\n        name\n        desc\n        region {\n          name\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.ProgramsIndexGetProgramsDocument,
    "\n  query GetVariant($id: ID!) {\n    variant(id: $id) {\n      id\n      name\n      desc\n      imageURL\n      images {\n        nodes {\n          url\n        }\n      }\n      orgs {\n        nodes {\n          org {\n            id\n            name\n            desc\n            avatarURL\n          }\n        }\n      }\n      components {\n        nodes {\n          component {\n            id\n            name\n            desc\n            imageURL\n          }\n        }\n      }\n    }\n  }\n": types.GetVariantDocument,
    "\n  query GetVariantRecycling($id: ID!) {\n    variant(id: $id) {\n      id\n      name\n      recycleScore {\n        score\n        rating\n        ratingF\n      }\n      components {\n        ...VariantRecycleStreams\n      }\n    }\n  }\n": types.GetVariantRecyclingDocument,
    "\n  query HomeFeed($region: ID) {\n    feed(region: $region) {\n      nodes {\n        id\n        format\n        title\n        category\n        markdownShort\n        link {\n          entityName\n          id\n        }\n        externalLink {\n          url\n        }\n      }\n    }\n  }\n": types.HomeFeedDocument,
    "\n  query CurrentRegionHome {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n      }\n    }\n  }\n": types.CurrentRegionHomeDocument,
    "\n  query CurrentRegionProfile {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n      }\n    }\n  }\n": types.CurrentRegionProfileDocument,
    "\n  query Search($query: String!) {\n    search(query: $query) {\n      nodes {\n        __typename\n        ... on Category {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n        ... on Item {\n          id\n          name_null: name\n          desc\n          imageURL\n        }\n        ... on Variant {\n          id\n          name_null: name\n          desc\n          imageURL\n          orgs(first: 3) {\n            nodes {\n              org {\n                name\n              }\n            }\n          }\n        }\n        ... on Place {\n          id\n          name_null: name\n          address {\n            street\n            city\n            region\n            country\n          }\n        }\n        ... on Org {\n          id\n          name\n          desc\n        }\n      }\n      totalCount\n    }\n  }\n": types.SearchDocument,
    "\n  query ScanSearchQuery($query: String!) {\n    search(query: $query, types: [VARIANT, ITEM]) {\n      nodes {\n        __typename\n        ... on Variant {\n          id\n          name\n          desc\n          imageURL\n        }\n        ... on Item {\n          id\n          name\n          desc\n          imageURL\n        }\n      }\n      totalCount\n    }\n  }\n": types.ScanSearchQueryDocument,
    "\n  query ChangesGetEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n": types.ChangesGetEditDocument,
    "\n  query DirectGetEdit($id: ID!, $entityName: String!) {\n    directEdit(id: $id, entityName: $entityName) {\n      entityName\n      id\n      updateInput\n    }\n  }\n": types.DirectGetEditDocument,
    "\n    query RefCategoryQuery($id: ID!) {\n      category(id: $id) {\n        ...ListCategoryFragment\n      }\n    }\n  ": types.RefCategoryQueryDocument,
    "\n    query RefItemQuery($id: ID!) {\n      item(id: $id) {\n        ...ListItemFragment\n      }\n    }\n  ": types.RefItemQueryDocument,
    "\n    query RefVariantQuery($id: ID!) {\n      variant(id: $id) {\n        ...ListVariantFragment\n      }\n    }\n  ": types.RefVariantQueryDocument,
    "\n    query RefComponentQuery($id: ID!) {\n      component(id: $id) {\n        ...ListComponentFragment\n      }\n    }\n  ": types.RefComponentQueryDocument,
    "\n    query RefOrgQuery($id: ID!) {\n      org(id: $id) {\n        ...ListOrgFragment\n      }\n    }\n  ": types.RefOrgQueryDocument,
    "\n    query RefRegionQuery($id: ID!) {\n      region(id: $id) {\n        ...ListRegionFragment\n      }\n    }\n  ": types.RefRegionQueryDocument,
    "\n    query RefPlaceQuery($id: ID!) {\n      place(id: $id) {\n        ...ListPlaceFragment\n      }\n    }\n  ": types.RefPlaceQueryDocument,
    "\n    query RefMaterialQuery($id: ID!) {\n      material(id: $id) {\n        ...ListMaterialFragment\n      }\n    }\n  ": types.RefMaterialQueryDocument,
    "\n  fragment ListCategoryFragment on Category {\n    id\n    name_req: name\n    descShort\n    imageURL\n  }\n": types.ListCategoryFragmentFragmentDoc,
    "\n  fragment ListChangeFragment on Change {\n    id\n    title\n    description\n    status\n  }\n": types.ListChangeFragmentFragmentDoc,
    "\n  fragment ListComponentFragment on Component {\n    id\n    name\n    desc\n    imageURL\n  }\n": types.ListComponentFragmentFragmentDoc,
    "\n  fragment ListItemFragment on Item {\n    id\n    name\n    desc\n    imageURL\n  }\n": types.ListItemFragmentFragmentDoc,
    "\n  fragment ListMaterialFragment on Material {\n    id\n    name\n    desc\n    shape\n  }\n": types.ListMaterialFragmentFragmentDoc,
    "\n  fragment ListOrgFragment on Org {\n    id\n    name_req: name\n    desc\n    avatarURL\n  }\n": types.ListOrgFragmentFragmentDoc,
    "\n  fragment ListPlaceFragment on Place {\n    id\n    name\n    desc\n  }\n": types.ListPlaceFragmentFragmentDoc,
    "\n  fragment ListProcessFragment on Process {\n    id\n    name\n    desc\n  }\n": types.ListProcessFragmentFragmentDoc,
    "\n  fragment ListRegionFragment on Region {\n    id\n    name\n  }\n": types.ListRegionFragmentFragmentDoc,
    "\n  fragment ListVariantFragment on Variant {\n    id\n    name\n    desc\n    imageURL\n  }\n": types.ListVariantFragmentFragmentDoc,
    "\n      query RefSearchQuery($input: String!, $type: SearchType!) {\n        search(query: $input, types: [$type]) {\n          totalCount\n          nodes {\n            ...ListCategoryFragment\n            ...ListItemFragment\n            ...ListVariantFragment\n            ...ListComponentFragment\n            ...ListOrgFragment\n            ...ListRegionFragment\n            ...ListPlaceFragment\n            ...ListMaterialFragment\n          }\n        }\n      }\n    ": types.RefSearchQueryDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment VariantRecycleStreams on VariantComponentsConnection {\n    nodes {\n      component {\n        id\n        name\n        desc\n        imageURL\n        primaryMaterial {\n          id\n          name\n        }\n        recycleScore {\n          score\n          rating\n          ratingF\n        }\n        recycle {\n          context {\n            key\n            markdown\n          }\n          stream {\n            name\n            desc\n            score {\n              score\n              rating\n              ratingF\n            }\n            container {\n              type\n              access\n              shape {\n                width\n                height\n                depth\n              }\n              color\n              image\n              imageEntryPoint {\n                x\n                y\n                side\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment VariantRecycleStreams on VariantComponentsConnection {\n    nodes {\n      component {\n        id\n        name\n        desc\n        imageURL\n        primaryMaterial {\n          id\n          name\n        }\n        recycleScore {\n          score\n          rating\n          ratingF\n        }\n        recycle {\n          context {\n            key\n            markdown\n          }\n          stream {\n            name\n            desc\n            score {\n              score\n              rating\n              ratingF\n            }\n            container {\n              type\n              access\n              shape {\n                width\n                height\n                depth\n              }\n              color\n              image\n              imageEntryPoint {\n                x\n                y\n                side\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation FeedbackVoteMissingData($input: VoteInput!) {\n    vote(input: $input) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation FeedbackVoteMissingData($input: VoteInput!) {\n    vote(input: $input) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation FeedbackVote($input: VoteInput!) {\n    vote(input: $input) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation FeedbackVote($input: VoteInput!) {\n    vote(input: $input) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ItemRecycleStreams on ItemRecycle {\n    stream {\n      name\n      desc\n      score {\n        score\n        rating\n        ratingF\n      }\n      container {\n        type\n        access\n        shape {\n          width\n          height\n          depth\n        }\n        color\n        image\n        imageEntryPoint {\n          x\n          y\n          side\n        }\n      }\n    }\n    context {\n      key\n      markdown\n    }\n  }\n"): (typeof documents)["\n  fragment ItemRecycleStreams on ItemRecycle {\n    stream {\n      name\n      desc\n      score {\n        score\n        rating\n        ratingF\n      }\n      container {\n        type\n        access\n        shape {\n          width\n          height\n          depth\n        }\n        color\n        image\n        imageEntryPoint {\n          x\n          y\n          side\n        }\n      }\n    }\n    context {\n      key\n      markdown\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RegionSelectQuery($id: ID!) {\n    region(id: $id) {\n      id\n      name\n      desc\n      placetype\n      bbox\n      minZoom\n    }\n  }\n"): (typeof documents)["\n  query RegionSelectQuery($id: ID!) {\n    region(id: $id) {\n      id\n      name\n      desc\n      placetype\n      bbox\n      minZoom\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RegionSelectCurrentRegion {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n        placetype\n        bbox\n        minZoom\n      }\n    }\n  }\n"): (typeof documents)["\n  query RegionSelectCurrentRegion {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n        placetype\n        bbox\n        minZoom\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RegionSelectSearch($query: String!) {\n    search(query: $query, types: [REGION]) {\n      nodes {\n        __typename\n        ... on Region {\n          id\n          name\n          desc\n          placetype\n        }\n      }\n      totalCount\n    }\n  }\n"): (typeof documents)["\n  query RegionSelectSearch($query: String!) {\n    search(query: $query, types: [REGION]) {\n      nodes {\n        __typename\n        ... on Region {\n          id\n          name\n          desc\n          placetype\n        }\n      }\n      totalCount\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ChangesCategorySchema {\n    categorySchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n"): (typeof documents)["\n  query ChangesCategorySchema {\n    categorySchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ChangesCategoryEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ChangesCategoryEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeCategoryCreate($input: CreateCategoryInput!) {\n    createCategory(input: $input) {\n      change {\n        id\n      }\n      category {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeCategoryCreate($input: CreateCategoryInput!) {\n    createCategory(input: $input) {\n      change {\n        id\n      }\n      category {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeCategoryUpdate($input: UpdateCategoryInput!) {\n    updateCategory(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeCategoryUpdate($input: UpdateCategoryInput!) {\n    updateCategory(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ChangesComponentSchema {\n    componentSchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n"): (typeof documents)["\n  query ChangesComponentSchema {\n    componentSchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ChangesComponentEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ChangesComponentEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeComponentCreate($input: CreateComponentInput!) {\n    createComponent(input: $input) {\n      change {\n        id\n      }\n      component {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeComponentCreate($input: CreateComponentInput!) {\n    createComponent(input: $input) {\n      change {\n        id\n      }\n      component {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeComponentUpdate($input: UpdateComponentInput!) {\n    updateComponent(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeComponentUpdate($input: UpdateComponentInput!) {\n    updateComponent(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ChangeQuery($id: ID!) {\n    change(id: $id) {\n      id\n      status\n      title\n      description\n      createdAt\n      updatedAt\n      user {\n        id\n        username\n      }\n      edits {\n        nodes {\n          id\n          entityName\n          original {\n            ... on Variant {\n              name\n            }\n            ... on Component {\n              name\n            }\n            ... on Category {\n              name_req: name\n            }\n            ... on Place {\n              name\n            }\n            ... on Item {\n              name\n            }\n            ... on Process {\n              name\n            }\n          }\n          changes {\n            ... on Variant {\n              name\n            }\n            ... on Component {\n              name\n            }\n            ... on Category {\n              name_req: name\n            }\n            ... on Place {\n              name\n            }\n            ... on Item {\n              name\n            }\n            ... on Process {\n              name\n            }\n          }\n        }\n        totalCount\n      }\n    }\n  }\n"): (typeof documents)["\n  query ChangeQuery($id: ID!) {\n    change(id: $id) {\n      id\n      status\n      title\n      description\n      createdAt\n      updatedAt\n      user {\n        id\n        username\n      }\n      edits {\n        nodes {\n          id\n          entityName\n          original {\n            ... on Variant {\n              name\n            }\n            ... on Component {\n              name\n            }\n            ... on Category {\n              name_req: name\n            }\n            ... on Place {\n              name\n            }\n            ... on Item {\n              name\n            }\n            ... on Process {\n              name\n            }\n          }\n          changes {\n            ... on Variant {\n              name\n            }\n            ... on Component {\n              name\n            }\n            ... on Category {\n              name_req: name\n            }\n            ... on Place {\n              name\n            }\n            ... on Item {\n              name\n            }\n            ... on Process {\n              name\n            }\n          }\n        }\n        totalCount\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeEditMutation($input: UpdateChangeInput!) {\n    updateChange(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeEditMutation($input: UpdateChangeInput!) {\n    updateChange(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeDeleteMutation($id: ID!) {\n    deleteChange(id: $id) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeDeleteMutation($id: ID!) {\n    deleteChange(id: $id) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeMergeMutation($id: ID!) {\n    mergeChange(id: $id) {\n      change {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeMergeMutation($id: ID!) {\n    mergeChange(id: $id) {\n      change {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ChangesProcessSchema {\n    processSchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n"): (typeof documents)["\n  query ChangesProcessSchema {\n    processSchema {\n      create {\n        schema\n        uischema\n      }\n      update {\n        schema\n        uischema\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ChangesProcessEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ChangesProcessEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeProcessCreate($input: CreateProcessInput!) {\n    createProcess(input: $input) {\n      change {\n        id\n      }\n      process {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeProcessCreate($input: CreateProcessInput!) {\n    createProcess(input: $input) {\n      change {\n        id\n      }\n      process {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeProcessUpdate($input: UpdateProcessInput!) {\n    updateProcess(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeProcessUpdate($input: UpdateProcessInput!) {\n    updateProcess(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ChangesIndexGetChanges($first: Int) {\n    changes(first: $first) {\n      nodes {\n        id\n        status\n        title\n        description\n        createdAt\n        updatedAt\n        edits {\n          totalCount\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ChangesIndexGetChanges($first: Int) {\n    changes(first: $first) {\n      nodes {\n        id\n        status\n        title\n        description\n        createdAt\n        updatedAt\n        edits {\n          totalCount\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ContributeProjectFeed($format: FeedFormat) {\n    feed(format: $format) {\n      nodes {\n        id\n        format\n        title\n        markdownShort\n        link {\n          entityName\n          id\n        }\n        externalLink {\n          url\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ContributeProjectFeed($format: FeedFormat) {\n    feed(format: $format) {\n      nodes {\n        id\n        format\n        title\n        markdownShort\n        link {\n          entityName\n          id\n        }\n        externalLink {\n          url\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ContributeMeChanges {\n    me {\n      id\n      changes {\n        nodes {\n          id\n          status\n          title\n          description\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ContributeMeChanges {\n    me {\n      id\n      changes {\n        nodes {\n          id\n          status\n          title\n          description\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCategoryNewChange($input: UpdateCategoryInput!) {\n    updateCategory(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateCategoryNewChange($input: UpdateCategoryInput!) {\n    updateCategory(input: $input) {\n      change {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CategoriesIDGetCategories($id: ID!) {\n    category(id: $id) {\n      id\n      name\n      descShort\n      desc\n      imageURL\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query CategoriesIDGetCategories($id: ID!) {\n    category(id: $id) {\n      id\n      name\n      descShort\n      desc\n      imageURL\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CategoriesIndexGetCategories {\n    categoryRoot {\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query CategoriesIndexGetCategories {\n    categoryRoot {\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ExploreGetItems($first: Int!) {\n    items(first: $first) {\n      nodes {\n        id\n        name\n        imageURL\n      }\n    }\n  }\n"): (typeof documents)["\n  query ExploreGetItems($first: Int!) {\n    items(first: $first) {\n      nodes {\n        id\n        name\n        imageURL\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ExploreGetPrograms($first: Int!) {\n    programs(first: $first) {\n      nodes {\n        id\n        name\n        desc\n        region {\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ExploreGetPrograms($first: Int!) {\n    programs(first: $first) {\n      nodes {\n        id\n        name\n        desc\n        region {\n          name\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetCategories {\n    categoryRoot {\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetCategories {\n    categoryRoot {\n      children {\n        nodes {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetItem($id: ID!) {\n    item(id: $id) {\n      id\n      name\n      desc\n      imageURL\n    }\n  }\n"): (typeof documents)["\n  query GetItem($id: ID!) {\n    item(id: $id) {\n      id\n      name\n      desc\n      imageURL\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetItemRecycling($id: ID!) {\n    item(id: $id) {\n      id\n      recycleScore {\n        score\n        rating\n        ratingF\n      }\n      recycle {\n        ...ItemRecycleStreams\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetItemRecycling($id: ID!) {\n    item(id: $id) {\n      id\n      recycleScore {\n        score\n        rating\n        ratingF\n      }\n      recycle {\n        ...ItemRecycleStreams\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetItemVariants($id: ID!) {\n    item(id: $id) {\n      id\n      variants {\n        nodes {\n          id\n          name\n          imageURL\n          recycleScore {\n            score\n            rating\n            ratingF\n          }\n          orgs {\n            nodes {\n              org {\n                name\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetItemVariants($id: ID!) {\n    item(id: $id) {\n      id\n      variants {\n        nodes {\n          id\n          name\n          imageURL\n          recycleScore {\n            score\n            rating\n            ratingF\n          }\n          orgs {\n            nodes {\n              org {\n                name\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ItemsIndexGetItems($first: Int!, $after: String) {\n    items(first: $first, after: $after) {\n      nodes {\n        id\n        name\n        imageURL\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): (typeof documents)["\n  query ItemsIndexGetItems($first: Int!, $after: String) {\n    items(first: $first, after: $after) {\n      nodes {\n        id\n        name\n        imageURL\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetOrg($id: ID!) {\n    org(id: $id) {\n      id\n      name\n      desc\n    }\n  }\n"): (typeof documents)["\n  query GetOrg($id: ID!) {\n    org(id: $id) {\n      id\n      name\n      desc\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPlace($id: ID!) {\n    place(id: $id) {\n      id\n      name\n      desc\n      address {\n        housenumber\n        street\n        city\n        region\n        postcode\n        country\n      }\n      location {\n        latitude\n        longitude\n      }\n      tags(first: 20) {\n        nodes {\n          id\n          name\n          image\n          bgColor\n        }\n      }\n      org {\n        id\n        name\n        desc\n        avatarURL\n        slug\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetPlace($id: ID!) {\n    place(id: $id) {\n      id\n      name\n      desc\n      address {\n        housenumber\n        street\n        city\n        region\n        postcode\n        country\n      }\n      location {\n        latitude\n        longitude\n      }\n      tags(first: 20) {\n        nodes {\n          id\n          name\n          image\n          bgColor\n        }\n      }\n      org {\n        id\n        name\n        desc\n        avatarURL\n        slug\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPlaceRelated($id: ID!) {\n    place(id: $id) {\n      id\n      related(limit: 10) {\n        nodes {\n          id\n          name\n          address {\n            city\n            region\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetPlaceRelated($id: ID!) {\n    place(id: $id) {\n      id\n      related(limit: 10) {\n        nodes {\n          id\n          name\n          address {\n            city\n            region\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PlacesIndexRegionQuery($id: ID!) {\n    region(id: $id) {\n      id\n      name\n      placetype\n      bbox\n      minZoom\n    }\n  }\n"): (typeof documents)["\n  query PlacesIndexRegionQuery($id: ID!) {\n    region(id: $id) {\n      id\n      name\n      placetype\n      bbox\n      minZoom\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PlaceSearch($search: String!, $latLong: [Float!]) {\n    search(query: $search, types: [PLACE], latlong: $latLong, limit: 100) {\n      nodes {\n        ... on Place {\n          id\n          name\n          address {\n            city\n          }\n          location {\n            latitude\n            longitude\n          }\n        }\n      }\n      totalCount\n    }\n  }\n"): (typeof documents)["\n  query PlaceSearch($search: String!, $latLong: [Float!]) {\n    search(query: $search, types: [PLACE], latlong: $latLong, limit: 100) {\n      nodes {\n        ... on Place {\n          id\n          name\n          address {\n            city\n          }\n          location {\n            latitude\n            longitude\n          }\n        }\n      }\n      totalCount\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProgramsIndexGetPrograms($first: Int!, $after: String) {\n    programs(first: $first, after: $after) {\n      nodes {\n        id\n        name\n        desc\n        region {\n          name\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): (typeof documents)["\n  query ProgramsIndexGetPrograms($first: Int!, $after: String) {\n    programs(first: $first, after: $after) {\n      nodes {\n        id\n        name\n        desc\n        region {\n          name\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetVariant($id: ID!) {\n    variant(id: $id) {\n      id\n      name\n      desc\n      imageURL\n      images {\n        nodes {\n          url\n        }\n      }\n      orgs {\n        nodes {\n          org {\n            id\n            name\n            desc\n            avatarURL\n          }\n        }\n      }\n      components {\n        nodes {\n          component {\n            id\n            name\n            desc\n            imageURL\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetVariant($id: ID!) {\n    variant(id: $id) {\n      id\n      name\n      desc\n      imageURL\n      images {\n        nodes {\n          url\n        }\n      }\n      orgs {\n        nodes {\n          org {\n            id\n            name\n            desc\n            avatarURL\n          }\n        }\n      }\n      components {\n        nodes {\n          component {\n            id\n            name\n            desc\n            imageURL\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetVariantRecycling($id: ID!) {\n    variant(id: $id) {\n      id\n      name\n      recycleScore {\n        score\n        rating\n        ratingF\n      }\n      components {\n        ...VariantRecycleStreams\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetVariantRecycling($id: ID!) {\n    variant(id: $id) {\n      id\n      name\n      recycleScore {\n        score\n        rating\n        ratingF\n      }\n      components {\n        ...VariantRecycleStreams\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query HomeFeed($region: ID) {\n    feed(region: $region) {\n      nodes {\n        id\n        format\n        title\n        category\n        markdownShort\n        link {\n          entityName\n          id\n        }\n        externalLink {\n          url\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query HomeFeed($region: ID) {\n    feed(region: $region) {\n      nodes {\n        id\n        format\n        title\n        category\n        markdownShort\n        link {\n          entityName\n          id\n        }\n        externalLink {\n          url\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CurrentRegionHome {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n      }\n    }\n  }\n"): (typeof documents)["\n  query CurrentRegionHome {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CurrentRegionProfile {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n      }\n    }\n  }\n"): (typeof documents)["\n  query CurrentRegionProfile {\n    currentRegion {\n      region {\n        id\n        name\n        desc\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Search($query: String!) {\n    search(query: $query) {\n      nodes {\n        __typename\n        ... on Category {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n        ... on Item {\n          id\n          name_null: name\n          desc\n          imageURL\n        }\n        ... on Variant {\n          id\n          name_null: name\n          desc\n          imageURL\n          orgs(first: 3) {\n            nodes {\n              org {\n                name\n              }\n            }\n          }\n        }\n        ... on Place {\n          id\n          name_null: name\n          address {\n            street\n            city\n            region\n            country\n          }\n        }\n        ... on Org {\n          id\n          name\n          desc\n        }\n      }\n      totalCount\n    }\n  }\n"): (typeof documents)["\n  query Search($query: String!) {\n    search(query: $query) {\n      nodes {\n        __typename\n        ... on Category {\n          id\n          name\n          descShort\n          desc\n          imageURL\n        }\n        ... on Item {\n          id\n          name_null: name\n          desc\n          imageURL\n        }\n        ... on Variant {\n          id\n          name_null: name\n          desc\n          imageURL\n          orgs(first: 3) {\n            nodes {\n              org {\n                name\n              }\n            }\n          }\n        }\n        ... on Place {\n          id\n          name_null: name\n          address {\n            street\n            city\n            region\n            country\n          }\n        }\n        ... on Org {\n          id\n          name\n          desc\n        }\n      }\n      totalCount\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ScanSearchQuery($query: String!) {\n    search(query: $query, types: [VARIANT, ITEM]) {\n      nodes {\n        __typename\n        ... on Variant {\n          id\n          name\n          desc\n          imageURL\n        }\n        ... on Item {\n          id\n          name\n          desc\n          imageURL\n        }\n      }\n      totalCount\n    }\n  }\n"): (typeof documents)["\n  query ScanSearchQuery($query: String!) {\n    search(query: $query, types: [VARIANT, ITEM]) {\n      nodes {\n        __typename\n        ... on Variant {\n          id\n          name\n          desc\n          imageURL\n        }\n        ... on Item {\n          id\n          name\n          desc\n          imageURL\n        }\n      }\n      totalCount\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ChangesGetEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ChangesGetEdit($id: ID!, $changeID: ID!) {\n    change(id: $changeID) {\n      status\n      edits(id: $id) {\n        nodes {\n          updateInput\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DirectGetEdit($id: ID!, $entityName: String!) {\n    directEdit(id: $id, entityName: $entityName) {\n      entityName\n      id\n      updateInput\n    }\n  }\n"): (typeof documents)["\n  query DirectGetEdit($id: ID!, $entityName: String!) {\n    directEdit(id: $id, entityName: $entityName) {\n      entityName\n      id\n      updateInput\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query RefCategoryQuery($id: ID!) {\n      category(id: $id) {\n        ...ListCategoryFragment\n      }\n    }\n  "): (typeof documents)["\n    query RefCategoryQuery($id: ID!) {\n      category(id: $id) {\n        ...ListCategoryFragment\n      }\n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query RefItemQuery($id: ID!) {\n      item(id: $id) {\n        ...ListItemFragment\n      }\n    }\n  "): (typeof documents)["\n    query RefItemQuery($id: ID!) {\n      item(id: $id) {\n        ...ListItemFragment\n      }\n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query RefVariantQuery($id: ID!) {\n      variant(id: $id) {\n        ...ListVariantFragment\n      }\n    }\n  "): (typeof documents)["\n    query RefVariantQuery($id: ID!) {\n      variant(id: $id) {\n        ...ListVariantFragment\n      }\n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query RefComponentQuery($id: ID!) {\n      component(id: $id) {\n        ...ListComponentFragment\n      }\n    }\n  "): (typeof documents)["\n    query RefComponentQuery($id: ID!) {\n      component(id: $id) {\n        ...ListComponentFragment\n      }\n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query RefOrgQuery($id: ID!) {\n      org(id: $id) {\n        ...ListOrgFragment\n      }\n    }\n  "): (typeof documents)["\n    query RefOrgQuery($id: ID!) {\n      org(id: $id) {\n        ...ListOrgFragment\n      }\n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query RefRegionQuery($id: ID!) {\n      region(id: $id) {\n        ...ListRegionFragment\n      }\n    }\n  "): (typeof documents)["\n    query RefRegionQuery($id: ID!) {\n      region(id: $id) {\n        ...ListRegionFragment\n      }\n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query RefPlaceQuery($id: ID!) {\n      place(id: $id) {\n        ...ListPlaceFragment\n      }\n    }\n  "): (typeof documents)["\n    query RefPlaceQuery($id: ID!) {\n      place(id: $id) {\n        ...ListPlaceFragment\n      }\n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query RefMaterialQuery($id: ID!) {\n      material(id: $id) {\n        ...ListMaterialFragment\n      }\n    }\n  "): (typeof documents)["\n    query RefMaterialQuery($id: ID!) {\n      material(id: $id) {\n        ...ListMaterialFragment\n      }\n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListCategoryFragment on Category {\n    id\n    name_req: name\n    descShort\n    imageURL\n  }\n"): (typeof documents)["\n  fragment ListCategoryFragment on Category {\n    id\n    name_req: name\n    descShort\n    imageURL\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListChangeFragment on Change {\n    id\n    title\n    description\n    status\n  }\n"): (typeof documents)["\n  fragment ListChangeFragment on Change {\n    id\n    title\n    description\n    status\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListComponentFragment on Component {\n    id\n    name\n    desc\n    imageURL\n  }\n"): (typeof documents)["\n  fragment ListComponentFragment on Component {\n    id\n    name\n    desc\n    imageURL\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListItemFragment on Item {\n    id\n    name\n    desc\n    imageURL\n  }\n"): (typeof documents)["\n  fragment ListItemFragment on Item {\n    id\n    name\n    desc\n    imageURL\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListMaterialFragment on Material {\n    id\n    name\n    desc\n    shape\n  }\n"): (typeof documents)["\n  fragment ListMaterialFragment on Material {\n    id\n    name\n    desc\n    shape\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListOrgFragment on Org {\n    id\n    name_req: name\n    desc\n    avatarURL\n  }\n"): (typeof documents)["\n  fragment ListOrgFragment on Org {\n    id\n    name_req: name\n    desc\n    avatarURL\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListPlaceFragment on Place {\n    id\n    name\n    desc\n  }\n"): (typeof documents)["\n  fragment ListPlaceFragment on Place {\n    id\n    name\n    desc\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListProcessFragment on Process {\n    id\n    name\n    desc\n  }\n"): (typeof documents)["\n  fragment ListProcessFragment on Process {\n    id\n    name\n    desc\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListRegionFragment on Region {\n    id\n    name\n  }\n"): (typeof documents)["\n  fragment ListRegionFragment on Region {\n    id\n    name\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListVariantFragment on Variant {\n    id\n    name\n    desc\n    imageURL\n  }\n"): (typeof documents)["\n  fragment ListVariantFragment on Variant {\n    id\n    name\n    desc\n    imageURL\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query RefSearchQuery($input: String!, $type: SearchType!) {\n        search(query: $input, types: [$type]) {\n          totalCount\n          nodes {\n            ...ListCategoryFragment\n            ...ListItemFragment\n            ...ListVariantFragment\n            ...ListComponentFragment\n            ...ListOrgFragment\n            ...ListRegionFragment\n            ...ListPlaceFragment\n            ...ListMaterialFragment\n          }\n        }\n      }\n    "): (typeof documents)["\n      query RefSearchQuery($input: String!, $type: SearchType!) {\n        search(query: $input, types: [$type]) {\n          totalCount\n          nodes {\n            ...ListCategoryFragment\n            ...ListItemFragment\n            ...ListVariantFragment\n            ...ListComponentFragment\n            ...ListOrgFragment\n            ...ListRegionFragment\n            ...ListPlaceFragment\n            ...ListMaterialFragment\n          }\n        }\n      }\n    "];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;